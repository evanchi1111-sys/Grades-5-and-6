/* 教材管理中心（原型）：匯入 → 解析草稿 → 重複檢查 → 審核 → 版本 → 發布 */
import { h, clear } from '../science/components/dom.js';
import * as S from './store.js';
import { validate, semanticChecks, collectItems } from './schema-check.js';
import * as A from './adapters.js';
import { LOADERS } from '../science/data/index.js';
import * as B from './bank-adapter.js';

const main = document.getElementById('cm-main'), tabsEl = document.getElementById('cm-tabs'), toastEl = document.getElementById('cm-toast');
const state = { tab: 'overview', unitId: null, ver: null, wiz: { files: [], mode: 'new', result: null, dup: null, pages: '' } };
let schema = null, publishedManifest = null;
const TABS = [['overview', '總覽'], ['import', '1 匯入教材'], ['preview', '2 預覽'], ['review', '3 審核'], ['versions', '4 版本'], ['publish', '5 發布'], ['guide', '說明']];
const author = () => S.settings().author || '管理者';

function toast(msg, bad) { toastEl.textContent = msg; toastEl.className = 'toast on' + (bad ? ' bad' : ''); clearTimeout(toast.t); toast.t = setTimeout(() => { toastEl.className = 'toast'; }, 4200); }
function download(name, text) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'application/json;charset=utf-8' })); a.download = name.split('/').pop(); document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 400); }
const badge = (st) => h('span', { class: 'st st-' + st, text: S.STATUSES[st] || st });
const cur = () => (state.unitId ? S.getVersion(state.unitId, state.ver) : null);

async function init() {
  try { schema = await (await fetch('content/schema/unit.schema.json')).json(); } catch (e) { schema = null; }
  try { const r = await fetch('content/manifest.json'); publishedManifest = r.ok ? await r.json() : null; } catch (e) { publishedManifest = null; }
  S.load(); draw();
}
function draw() {
  clear(tabsEl); TABS.forEach(([k, n]) => tabsEl.append(h('button', { type: 'button', class: 'tab' + (state.tab === k ? ' on' : ''), onclick: () => { state.tab = k; draw(); } }, n)));
  clear(main);
  if (!schema) main.append(h('div', { class: 'warn bad' }, '無法讀取 content/schema/unit.schema.json。請用網址（http）開啟本頁，不要直接開檔案。'));
  ({ overview, import: importTab, preview, review, versions, publish, guide })[state.tab]();
}
const needUnit = () => { if (cur()) return true; main.append(h('div', { class: 'card' }, h('p', { text: '請先在「總覽」選擇一個單元。' }), h('button', { type: 'button', class: 'btn', onclick: () => { state.tab = 'overview'; draw(); } }, '到總覽'))); return false; };

/* ===== 總覽 ===== */
function overview() {
  const units = S.listUnits();
  main.append(h('div', { class: 'card' }, h('h2', { text: '單元清單' }), units.length ? h('table', { class: 'tbl' }, h('tr', {}, ...['unitId', '單元', '狀態', '目前版本', '已發布版本', ''].map((x) => h('th', { text: x }))),
    ...units.map((u) => h('tr', {}, h('td', { text: u.unitId }), h('td', { text: `${u.current.data.subjectName}・${u.current.data.unitTitle}` }), h('td', {}, badge(u.current.status)), h('td', { text: 'v' + u.currentVersion + `（共 ${u.versions.length} 版）` }), h('td', { text: u.publishedVersion ? 'v' + u.publishedVersion : '—' }),
      h('td', {}, h('button', { type: 'button', class: 'btn', onclick: () => { state.unitId = u.unitId; state.ver = null; state.tab = 'preview'; draw(); } }, '開啟'))))) : h('p', { class: 'note', text: '還沒有單元。可以從下面「匯入既有單元」開始看看轉換結果，或到「1 匯入教材」上傳新教材。' })));
  main.append(h('div', { class: 'card' }, h('h2', { text: '把既有互動單元轉成新格式（唯讀）' }), h('p', { class: 'note', text: '用來驗證新格式能完整容納現有教材。原本的 science 資料與原教材頁完全不會被修改；轉換結果是待審核草稿，不會發布。' }),
    h('div', { class: 'row' }, ...A.LEGACY_IDS.map((id) => h('button', { type: 'button', class: 'btn', onclick: async (e) => { e.target.disabled = true; try { const d = await A.legacyToUnit(id, author()); if (S.getUnit(d.unitId)) { toast(`${d.unitId} 已經在管理中心裡了`, true); } else { S.createUnit(d); toast('已轉換 ' + d.unitId); } } catch (err) { toast('轉換失敗：' + err.message, true); } draw(); } }, id)))));
  // 試點：從既有刷題題庫（index.html）轉入一個單元（唯讀）
  const bankBox = h('div', { class: 'card' }, h('h2', { text: '從既有刷題題庫轉入單元（唯讀・試點）' }), h('p', { class: 'note', text: '讀取 index.html 的題庫，轉成新格式的待審核草稿；原題庫不會被修改。支援選擇、是非、填充、配合、排序、分類六種題型。' }), h('p', { class: 'note', text: '載入題庫中…' }));
  main.append(bankBox);
  B.bankIndex().then((idx) => {
    let pick = idx.units.find((x) => x.u === 8) || idx.units[0]; const no = h('input', { type: 'number', min: 1, max: 99, value: 1, 'aria-label': '單元編號' }); const extra = h('input', { type: 'text', placeholder: '附加來源檔路徑（選填，逗號分隔）例：pdf/kt-g6-math-u1-exam.pdf', style: 'width:100%' });
    const sel = h('select', { 'aria-label': '題庫單元', onchange: (e) => { pick = idx.units.find((x) => x.u === +e.target.value); } }, ...idx.units.map((x) => h('option', { value: x.u, selected: x === pick, text: `u=${x.u}　${x.subj}・${x.short}・${x.name}（${x.count} 題）` })));
    clear(bankBox); bankBox.append(h('h2', { text: '從既有刷題題庫轉入單元（唯讀・試點）' }), h('p', { class: 'note', text: '讀取 index.html 的題庫，轉成新格式的待審核草稿；原題庫不會被修改。支援選擇、是非、填充、配合、排序、分類六種題型。' }),
      h('div', { class: 'grid2' }, h('label', {}, '題庫單元', sel), h('label', {}, '新單元編號（unitNumber）', no)), h('label', {}, '附加來源檔', extra),
      h('div', { class: 'row' }, h('button', { type: 'button', class: 'btn btn-primary', onclick: async (e) => { e.target.disabled = true; try { const r = await B.legacyBankUnit(idx, pick.u, { unitNumber: +no.value || 1, extraFiles: extra.value.split(',').map((x) => x.trim()).filter(Boolean), author: author() }); if (S.getUnit(r.unit.unitId)) throw new Error(`${r.unit.unitId} 已存在，請換一個單元編號`); S.createUnit(r.unit); toast(`已轉入 ${r.unit.unitId}：${r.unit.questions.length} 題${r.skipped ? `（有 ${r.skipped} 行無法解析）` : ''}`); state.unitId = r.unit.unitId; state.ver = null; state.tab = 'preview'; } catch (err) { toast('轉入失敗：' + err.message, true); } draw(); } }, '轉入為草稿')));
  }).catch((e) => { clear(bankBox); bankBox.append(h('p', { class: 'bad', text: '讀不到題庫：' + e.message })); });
  main.append(h('div', { class: 'card' }, h('h2', { text: '設定' }), h('label', {}, '管理者姓名（會記錄為作者與審核者）：', h('input', { type: 'text', value: author(), maxlength: 20, onchange: (e) => { S.settings().author = e.target.value.trim() || '管理者'; S.save(); toast('已儲存'); } })),
    h('label', { class: 'radio' }, h('input', { type: 'checkbox', checked: S.settings().allowSelfReview !== false, onchange: (e) => { S.settings().allowSelfReview = e.target.checked; S.save(); toast(e.target.checked ? '已允許自我審查' : '已禁止自我審查'); } }), ' 允許自我審查（審核者可以與作者是同一人；會在版本紀錄中標示）'),
    h('p', { class: 'note', text: 'AI 解析服務位址：未設定（需要自己的後端；前端不放任何 API 金鑰）。' })));
  main.append(h('div', { class: 'card' }, h('h2', { text: '備份與還原' }), h('p', { class: 'note', text: '管理中心的資料只存在這個瀏覽器。請定期備份；換電腦或清除瀏覽器資料前務必先備份。備份檔不含學生學習紀錄。' }),
    h('div', { class: 'row' }, h('button', { type: 'button', class: 'btn btn-primary', onclick: () => { download(`教材管理中心備份-${new Date().toISOString().slice(0, 10)}.json`, S.exportBackup()); toast('已下載備份'); } }, '⬇ 下載備份'),
      h('label', { class: 'btn' }, '⬆ 還原備份（取代目前資料）', h('input', { type: 'file', accept: '.json', hidden: true, onchange: async (e) => { const f = e.target.files[0]; if (!f) return; if (!confirm('用備份檔取代目前的管理中心資料？目前資料會被覆蓋（建議先下載備份）。')) return; try { const n = S.importBackup(await f.text(), 'replace'); toast(`已還原 ${n} 個單元`); } catch (err) { toast('還原失敗：' + err.message, true); } draw(); } })),
      h('button', { type: 'button', class: 'btn danger', onclick: () => { if (confirm('清除管理中心的所有草稿與版本？（不影響學生端學習紀錄與原教材；請先備份）')) { S.reset(); toast('已清除管理中心資料'); draw(); } } }, '清除管理中心資料'))));
  main.append(h('div', { class: 'card' }, h('h2', { text: '操作紀錄' }), h('ul', { class: 'log' }, ...(S.load().log.slice(0, 12).map((l) => h('li', { text: `${new Date(l.t).toLocaleString('zh-TW')}・${l.unitId}・${l.action}：${l.detail}` }))), S.load().log.length ? null : h('li', { text: '（沒有）' }))));
}

/* ===== 匯入 ===== */
function importTab() {
  const w = state.wiz;
  const files = h('input', { type: 'file', multiple: true, accept: '.pdf,.docx,.pptx,.jpg,.jpeg,.png,.txt,.json,.csv', onchange: (e) => { w.files = [...e.target.files]; w.result = null; w.dup = null; draw(); } });
  const sel = (id, opts, val, on) => h('select', { id, onchange: (e) => on(e.target.value) }, ...opts.map(([v, n]) => h('option', { value: v, selected: String(v) === String(val), text: n })));
  w.cls = w.cls || { grade: 5, subject: 'NAT', no: 1, title: '', version: '未標示' };
  const c = w.cls; const unitId = A.makeUnitId(c.grade, c.subject, c.no);
  main.append(h('div', { class: 'card' }, h('h2', { text: 'Step 1　選擇檔案' }), files,
    h('p', { class: 'note', text: '支援：JSON、CSV 題庫、TXT、JPG／PNG 可直接在本機解析；PDF、DOCX、PPTX 需要外部解析服務（尚未連接），目前只會登記檔案與來源，內容標為「待人工確認」。' }),
    w.files.length ? h('ul', {}, ...w.files.map((f) => { const a = A.adapterFor(f.name); return h('li', {}, `${f.name}（${Math.round(f.size / 1024)} KB）→ `, a ? h('b', { text: a.name }) : h('b', { class: 'bad', text: '不支援的格式' }), a && a.kind === 'external' ? h('span', { class: 'note', text: '　' + a.note }) : null); })) : null));
  main.append(h('div', { class: 'card' }, h('h2', { text: 'Step 2　年級、科目、單元' }),
    h('div', { class: 'grid2' },
      h('label', {}, '年級', sel('g', Array.from({ length: 12 }, (_, i) => [i + 1, i + 1 + ' 年級']), c.grade, (v) => { c.grade = +v; draw(); })),
      h('label', {}, '科目', sel('s', Object.entries(A.SUBJECTS).map(([k, n]) => [k, `${n}（${k}）`]), c.subject, (v) => { c.subject = v; draw(); })),
      h('label', {}, '單元編號', h('input', { type: 'number', min: 1, max: 99, value: c.no, onchange: (e) => { c.no = Math.max(1, +e.target.value || 1); draw(); } })),
      h('label', {}, '單元名稱', h('input', { type: 'text', value: c.title, placeholder: '例如：太陽的祕密', onchange: (e) => { c.title = e.target.value; } })),
      h('label', {}, '課本版本', h('input', { type: 'text', value: c.version, onchange: (e) => { c.version = e.target.value || '未標示'; } }))),
    h('p', {}, '單元代碼：', h('b', { text: unitId }), S.getUnit(unitId) ? h('span', { class: 'st st-pending_review', text: '管理中心已有這個單元' }) : h('span', { class: 'note', text: '（新代碼）' })),
    h('h3', { text: '匯入方式' }),
    ...[['new', '新增全新單元', '建立 v1 草稿；unitId 已存在時不會覆蓋'], ['update', '更新既有單元', '保留舊版，建立新版本草稿'], ['supplement', '新增教材補充資料', '只新增補充段落與來源檔'], ['questions', '新增題庫', '只新增題目；高度相似的題目會略過'], ['attachments', '僅更新圖片或附件', '只新增圖片與來源檔']].map(([v, n, d]) => h('label', { class: 'radio' }, h('input', { type: 'radio', name: 'mode', checked: w.mode === v, onchange: () => { w.mode = v; } }), h('b', { text: ' ' + n }), h('span', { class: 'note', text: '　' + d }))),
    h('div', { class: 'row' }, h('button', { type: 'button', class: 'btn btn-primary', disabled: !w.files.length, onclick: analyze }, '解析並檢查重複'), h('button', { type: 'button', class: 'btn', disabled: true, title: '需要自己的後端與金鑰管理；前端不放金鑰' }, 'AI 解析（需後端，尚未連接）'))));
  main.append(h('div', { class: 'card' }, h('h2', { text: '（進階）貼上外部解析服務的結果' }), h('p', { class: 'note', text: '格式：{"pages":[{"page":1,"blocks":[{"type":"heading|text|image|question","text":"…","bbox":[x,y,w,h],"question":{…}}]}]}。每個區塊會保留頁碼與位置，全部標為待人工確認。' }),
    h('textarea', { rows: 5, placeholder: '{"pages":[…]}', oninput: (e) => { w.pages = e.target.value; } }, w.pages)));
  if (w.result) main.append(resultCard());
}

async function analyze() {
  const w = state.wiz, c = w.cls, unitId = A.makeUnitId(c.grade, c.subject, c.no); const patch = { sourceFiles: [], lessons: [], keyPoints: [], illustrations: [], questions: [] }; const notes = []; let fullUnit = null; const dup = { files: [], unit: null, questions: [] };
  let seq = 1; const seen = new Map();
  for (const f of w.files) {
    const ad = A.adapterFor(f.name); const role = w.mode === 'supplement' ? 'supplement' : /\.(jpg|jpeg|png)$/i.test(f.name) ? 'image' : 'original';
    const { buf, rec } = await A.fileRecord(f, role, ad ? ad.id + '@1' : ''); const known = S.knownFile(rec.sha256); if (known) dup.files.push(`${f.name} 與先前上傳的「${known.fileName}」內容完全相同（${known.unitIds.join('、')}）`);
    if (seen.has(rec.sha256)) { dup.files.push(`${f.name} 與這次一起上傳的「${seen.get(rec.sha256)}」內容完全相同，已略過`); notes.push(`${f.name}：與「${seen.get(rec.sha256)}」重複，已略過。`); continue; } seen.set(rec.sha256, f.name);
    patch.sourceFiles.push(rec); const ctx = { unitId, fileId: rec.fileId, fileName: f.name, seq: seq++ };
    if (!ad) { notes.push(`${f.name}：不支援的格式，只登記檔案。`); continue; }
    if (ad.kind === 'external') { notes.push(`${f.name}：${ad.note} 已登記原始檔與雜湊；內容需由外部解析服務或人工建立（標為待人工確認）。`); patch.lessons.push({ lessonId: `${unitId}-L${A.pad(patch.lessons.length + 1)}`, title: `（待解析）${f.name}`, order: patch.lessons.length + 1, blocks: [{ type: 'note', text: '尚未解析。請接入外部解析服務，或由人工建立內容。' }], keyPointIds: [], source: { fileId: rec.fileId, fileName: f.name }, reviewStatus: 'needs_confirmation' }); continue; }
    const text = ad.id === 'image' ? '' : new TextDecoder('utf-8').decode(buf); const r = await ad.parse(f, text, ctx);
    (r.notes || []).forEach((n) => notes.push(`${f.name}：${n}`)); if (r.fullUnit) fullUnit = r.fullUnit;
    if (r.patch) ['lessons', 'keyPoints', 'illustrations', 'questions'].forEach((k) => { if (r.patch[k]) patch[k].push(...r.patch[k]); });
  }
  if (w.pages.trim()) { try { const p = JSON.parse(w.pages); const r = A.fromPages(p, { unitId, fileId: (patch.sourceFiles[0] || {}).fileId || 'F-external', fileName: (patch.sourceFiles[0] || {}).fileName || '外部解析結果' }); ['lessons', 'questions', 'illustrations'].forEach((k) => patch[k].push(...r[k])); notes.push(`外部解析結果：${r.lessons.length} 段、${r.questions.length} 題、${r.illustrations.length} 張圖（含頁碼，待人工確認）`); } catch (e) { notes.push('外部解析結果 JSON 格式錯誤：' + e.message); } }
  // 重複檢查：unitId、題目相似度（對管理中心內所有單元＋既有 science 題庫）
  dup.unit = S.getUnit(unitId) ? `管理中心已有 ${unitId}（目前 v${S.getUnit(unitId).currentVersion}，${S.STATUSES[S.getVersion(unitId).status]}）` : null;
  const pool = []; S.listUnits().forEach((u) => u.versions.forEach((v) => v.data.questions.forEach((q) => pool.push({ id: u.unitId + ' ' + q.questionId, t: q.questionText }))));
  for (const id of Object.keys(LOADERS)) { const U = (await LOADERS[id]()).default; U.questions.forEach((q) => pool.push({ id: `既有互動單元 ${id}・${q.id}`, t: q.q })); }
  const qs = fullUnit ? fullUnit.questions : patch.questions; qs.forEach((q) => { let best = { s: 0 }; pool.forEach((p) => { const s = A.similarity(q.questionText, p.t); if (s > best.s) best = { s, id: p.id }; }); if (best.s >= 0.8) dup.questions.push({ q, ...best }); });
  if (dup.unit && w.mode === 'new') dup.hint = '這個 unitId 已存在：建議改用「更新既有單元」建立新版本。';
  if (!dup.unit && w.mode === 'update') dup.hint = '找不到要更新的單元：請改用「新增全新單元」。';
  w.result = { unitId, patch, fullUnit, notes }; w.dup = dup; draw();
}

function resultCard() {
  const w = state.wiz, r = w.result, d = w.dup, p = r.fullUnit || r.patch;
  const count = (k) => (p[k] || []).length;
  return h('div', { class: 'card' }, h('h2', { text: 'Step 3　解析結果與重複檢查' }),
    h('p', {}, `解析出：段落 ${count('lessons')}、知識點 ${count('keyPoints')}、圖片 ${count('illustrations')}、題目 ${count('questions')}、來源檔 ${(r.patch.sourceFiles || []).length}`),
    h('ul', {}, ...r.notes.map((n) => h('li', { text: n }))),
    h('h3', { text: '重複檢查' }), h('ul', {}, d.unit ? h('li', { class: 'warnline', text: d.unit }) : h('li', { text: '✔ 沒有相同的 unitId' }), ...(d.files.length ? d.files.map((x) => h('li', { class: 'warnline', text: '⚠ 檔案重複：' + x })) : [h('li', { text: '✔ 沒有重複的檔案' })]),
      d.questions.length ? h('li', { class: 'warnline', text: `⚠ 有 ${d.questions.length} 題與既有題目高度相似（≥80%），題庫匯入時會略過：` + d.questions.slice(0, 4).map((x) => `「${x.q.questionText.slice(0, 16)}…」≈ ${x.id}（${Math.round(x.s * 100)}%）`).join('；') }) : h('li', { text: '✔ 沒有高度相似的題目' }), d.hint ? h('li', { class: 'warnline', text: d.hint }) : null),
    h('div', { class: 'row' }, h('button', { type: 'button', class: 'btn btn-primary', onclick: createDraft }, '建立草稿（不會發布）')));
}

function createDraft() {
  const w = state.wiz, c = w.cls, r = w.result, dup = w.dup; const unitId = r.unitId; const dupQ = new Set(dup.questions.map((x) => x.q));
  try {
    const stubKP = (d, qs) => { // 題目上的知識點若只是名稱，就建立正式的 knowledgePointId（單元代碼-KP-序號），名稱放在 text
      const byText = new Map(d.keyPoints.map((k) => [k.text, k.knowledgePointId])); const have = new Set(d.keyPoints.map((k) => k.knowledgePointId));
      qs.forEach((q) => { const raw = (q.knowledgePointId || '').trim(); if (have.has(raw)) return; const name = raw || '（未分類，待人工指定）';
        if (!byText.has(name)) { const id = `${unitId}-KP-${A.pad(have.size + 1)}`; have.add(id); byText.set(name, id); d.keyPoints.push({ knowledgePointId: id, text: name, source: { fileName: q.sourceFile || '' }, reviewStatus: 'needs_confirmation' }); }
        q.knowledgePointId = byText.get(name); }); };
    const assignIds = (d, qs) => { let n = d.questions.reduce((m, q) => Math.max(m, +(/Q(\d+)$/.exec(q.questionId) || [0, 0])[1]), 0); qs.forEach((q) => { q.unitId = unitId; if (!q.questionId || !q.questionId.startsWith(unitId)) q.questionId = `${unitId}-Q${A.pad(++n, 3)}`; }); };
    const keep = (arr) => arr.filter((q) => !dupQ.has(q));
    const apply = (d) => {
      const P = r.patch; d.sourceFiles.push(...P.sourceFiles.filter((f) => !d.sourceFiles.some((x) => x.sha256 === f.sha256)));
      if (['new', 'update'].includes(w.mode)) { const qs = keep(r.fullUnit ? r.fullUnit.questions : P.questions); assignIds(d, qs); d.questions.push(...qs); stubKP(d, qs); P.lessons.forEach((l) => { l.lessonId = `${unitId}-L${A.pad(d.lessons.length + 1)}`; l.order = d.lessons.length + 1; d.lessons.push(l); }); d.illustrations.push(...P.illustrations.map((x, i) => ({ ...x, illustrationId: `${unitId}-I${A.pad(d.illustrations.length + i + 1, 3)}` }))); }
      if (w.mode === 'supplement') P.lessons.forEach((l) => { l.lessonId = `${unitId}-L${A.pad(d.lessons.length + 1)}`; l.order = d.lessons.length + 1; l.title = '（補充）' + l.title; d.lessons.push(l); });
      if (w.mode === 'questions') { const qs = keep(P.questions); assignIds(d, qs); d.questions.push(...qs); stubKP(d, qs); }
      if (w.mode === 'attachments') d.illustrations.push(...P.illustrations.map((x, i) => ({ ...x, illustrationId: `${unitId}-I${A.pad(d.illustrations.length + i + 1, 3)}` })));
    };
    const summaryOf = { new: '新增全新單元', update: '更新既有單元', supplement: '新增教材補充資料', questions: '新增題庫', attachments: '更新圖片或附件' }[w.mode] + `（${r.patch.sourceFiles.map((f) => f.fileName).join('、')}）`;
    if (w.mode === 'new') {
      if (S.getUnit(unitId)) throw new Error(unitId + ' 已存在，請改用「更新既有單元」');
      if (!c.title.trim() && !r.fullUnit) throw new Error('請填寫單元名稱');
      const base = r.fullUnit ? JSON.parse(JSON.stringify(r.fullUnit)) : A.skeleton({ grade: c.grade, subject: c.subject, unitNumber: c.no, unitTitle: c.title.trim(), textbookVersion: c.version, author: author(), summary: summaryOf });
      if (r.fullUnit) { if (r.fullUnit.unitId !== unitId) throw new Error(`JSON 內的 unitId（${r.fullUnit.unitId}）與你選的單元代碼（${unitId}）不同`); base.version = { ...(base.version || {}), number: 1, createdAt: A.nowIso(), summary: summaryOf, author: author(), reviewer: null, reviewedAt: null, parentVersion: null, publishedAt: null }; base.questions.forEach((q) => { q.reviewStatus = 'pending'; }); }
      else apply(base);
      S.createUnit(base);
    } else {
      if (!S.getUnit(unitId)) throw new Error('找不到要更新的單元 ' + unitId + '，請先「新增全新單元」');
      S.newVersion(unitId, apply, summaryOf, author());
    }
    r.patch.sourceFiles.forEach((f) => S.rememberFile(f, unitId));
    state.unitId = unitId; state.ver = null; state.tab = 'preview'; state.wiz = { files: [], mode: 'new', result: null, dup: null, pages: '', cls: c }; toast('已建立草稿（待審核前學生端看不到）'); draw();
  } catch (e) { toast(e.message, true); }
}

/* ===== 預覽 ===== */
function preview() {
  if (!needUnit()) return; const v = cur(), d = v.data; const u = S.getUnit(state.unitId);
  const vsel = h('select', { onchange: (e) => { state.ver = +e.target.value; draw(); } }, ...u.versions.map((x) => h('option', { value: x.number, selected: x.number === v.number, text: `v${x.number}・${S.STATUSES[x.status]}` })));
  const stat = (k, n) => h('span', { class: 'chipn' }, `${k} ${n}`);
  main.append(h('div', { class: 'card' }, h('h2', { text: `${d.unitId}　${d.unitTitle}` }), h('div', { class: 'row' }, badge(v.status), vsel, stat('段落', d.lessons.length), stat('知識點', d.keyPoints.length), stat('圖片', d.illustrations.length), stat('實驗', d.experiments.length), stat('題目', d.questions.length)),
    h('p', { class: 'note' }, `${d.grade} 年級・${d.subjectName}・課本版本：${d.textbookVersion}・作者：${d.version.author}・審核者：${d.version.reviewer || '—'}`), v.status === 'published' ? null : h('p', { class: 'note', text: '學生端目前看不到這個版本（只有「已發布」才會出現）。' })));
  const sec = (title, kids) => main.append(h('div', { class: 'card' }, h('h3', { text: title }), ...kids));
  const src = (s) => h('span', { class: 'note' }, s ? ` ［${s.fileName || ''}${s.page ? ' 第 ' + s.page + ' 頁' : ''}${s.locator ? '・' + s.locator : ''}${s.legacyRef ? '・' + s.legacyRef : ''}］` : '');
  const rv = (x) => h('span', { class: 'rv rv-' + x.reviewStatus, text: { pending: '待審核', approved: '已審核', rejected: '退回', needs_confirmation: '待人工確認' }[x.reviewStatus] });
  sec('學習目標', [h('ul', {}, ...(d.learningObjectives.length ? d.learningObjectives.map((x) => h('li', { text: x })) : [h('li', { class: 'note', text: '（尚未填寫）' })]))]);
  sec('來源檔案', [d.sourceFiles.length ? h('table', { class: 'tbl' }, h('tr', {}, ...['檔名', '角色', '大小', 'SHA-256（前 12 碼）', '解析器'].map((x) => h('th', { text: x }))), ...d.sourceFiles.map((f) => h('tr', {}, h('td', { text: f.fileName }), h('td', { text: f.role }), h('td', { text: Math.round(f.sizeBytes / 1024) + ' KB' }), h('td', { text: f.sha256.slice(0, 12) }), h('td', { text: f.parser || '—' })))) : h('p', { class: 'note', text: '（沒有）' })]);
  sec('教材段落', d.lessons.length ? d.lessons.map((l) => h('div', { class: 'item' }, h('b', { text: `${l.order}. ${l.title}` }), ' ', rv(l), l.ref ? h('span', { class: 'note', text: `　引用既有教材：${l.ref.page}（節點 ${l.ref.nodeId}，不複製內容）` }) : null, ...(l.blocks || []).map((b) => h('p', { text: b.text || (b.items || []).join('、') })), src(l.source))) : [h('p', { class: 'note', text: '（沒有）' })]);
  sec('知識點', d.keyPoints.length ? [h('ul', {}, ...d.keyPoints.map((k) => h('li', {}, k.text, ' ', rv(k), h('span', { class: 'note', text: ' ' + k.knowledgePointId }), k.remedy ? h('span', { class: 'note', text: `　答錯時連到：${k.remedy.type === 'experiment' ? '互動實驗' : '教材'} ${k.remedy.targetId}` }) : null)))] : [h('p', { class: 'note', text: '（沒有）' })]);
  sec('實驗與示範', [...d.experiments.map((e) => h('div', { class: 'item' }, h('b', { text: '🔬 ' + e.title }), ' ', rv(e), h('p', { text: e.objective }), h('p', { class: 'note', text: '安全提醒：' + e.safety + (e.activityRef ? '　互動：' + e.activityRef : '') }))), ...d.examples.map((x) => h('div', { class: 'item' }, h('b', { text: '📝 ' + x.title }), ' ', rv(x), h('p', { text: x.problem })))]);
  const qt = { mc: '選擇', tf: '是非', match: '配合', fill: '填充', short: '簡答' };
  sec(`題庫（${d.questions.length}）`, d.questions.length ? [h('table', { class: 'tbl' }, h('tr', {}, ...['題號', '題型', '難度', '知識點', '題目', '答案', '來源', '審核'].map((x) => h('th', { text: x }))),
    ...d.questions.map((q) => h('tr', {}, h('td', { text: q.questionId.split('-').slice(-1)[0] }), h('td', { text: qt[q.questionType] }), h('td', { text: ['', '基礎', '進階', '精熟'][q.difficulty] }), h('td', { text: (d.keyPoints.find((k) => k.knowledgePointId === q.knowledgePointId) || { text: q.knowledgePointId }).text }), h('td', { text: q.questionText }),
      h('td', { text: q.questionType === 'mc' ? (q.options[q.correctAnswer] ?? '？') : JSON.stringify(q.correctAnswer) }), h('td', { text: (q.sourceFile || '') + (q.sourcePage ? ' p.' + q.sourcePage : '') }), h('td', {}, rv(q)))))] : [h('p', { class: 'note', text: '（沒有）' })]);
  if (d.questions.length) { const q = d.questions[0]; sec('學生端題目預覽（第 1 題）', [h('div', { class: 'qprev' }, h('p', { class: 'qtext', text: q.questionText }), ...(q.options || []).map((o, i) => h('div', { class: 'opt', text: String.fromCharCode(65 + i) + '. ' + o })), h('p', { class: 'note', text: '解析：' + q.explanation }))]); }
}

/* ===== 審核 ===== */
function review() {
  if (!needUnit()) return; const v = cur(), d = v.data; const locked = ['approved', 'published', 'archived'].includes(v.status);
  const errs = schema ? validate(schema, d) : [{ path: '$', msg: '沒有載入 Schema' }]; const sem = semanticChecks(d); const bad = [...errs.map((e) => ({ ...e, level: 'error' })), ...sem];
  const nErr = bad.filter((x) => x.level === 'error').length, nWarn = bad.length - nErr;
  main.append(h('div', { class: 'card' }, h('h2', { text: `審核：${d.unitId}　v${v.number}` }), h('div', { class: 'row' }, badge(v.status), h('span', { class: nErr ? 'bad' : 'ok', text: nErr ? `✘ 格式／語意錯誤 ${nErr} 項` : '✔ 格式與語意檢查通過' }), nWarn ? h('span', { class: 'warnline', text: `⚠ 提醒 ${nWarn} 項` }) : null),
    bad.length ? h('details', { open: nErr > 0 }, h('summary', { text: '檢查結果' }), h('ul', { class: 'errs' }, ...bad.slice(0, 60).map((x) => h('li', { class: x.level === 'error' ? 'bad' : 'warnline', text: `${x.level === 'error' ? '✘' : '⚠'} ${x.path}：${x.msg}` })))) : null,
    locked ? h('p', { class: 'note', text: '這一版已鎖定（已審核／已發布／已封存），不能再修改內容。要修改請到「版本」建立新版本。' }) : null));
  const groups = [['段落', d.lessons], ['知識點', d.keyPoints], ['圖片', d.illustrations], ['實驗', d.experiments], ['範例', d.examples], ['題目', d.questions], ['解析', d.explanations], ['常見錯誤', d.commonMistakes]].filter(([, a]) => a.length);
  const counts = (a) => ['pending', 'approved', 'rejected', 'needs_confirmation'].map((s) => a.filter((x) => x.reviewStatus === s).length);
  main.append(h('div', { class: 'card' }, h('h3', { text: '各類內容的審核進度' }), h('table', { class: 'tbl' }, h('tr', {}, ...['類別', '待審核', '已審核', '退回', '待人工確認', '批次操作'].map((x) => h('th', { text: x }))),
    ...groups.map(([n, a]) => { const c = counts(a); return h('tr', {}, h('td', { text: `${n}（${a.length}）` }), ...c.map((x) => h('td', { text: String(x) })), h('td', {}, locked ? '' : h('div', { class: 'row' }, h('button', { type: 'button', class: 'btn sm', onclick: () => { S.setItemStatus(state.unitId, a, 'approved'); draw(); } }, '全部通過'), h('button', { type: 'button', class: 'btn sm', onclick: () => { S.setItemStatus(state.unitId, a, 'needs_confirmation'); draw(); } }, '全部待確認')))); }))));
  if (d.questions.length) main.append(h('div', { class: 'card' }, h('h3', { text: '逐題審核' }), h('table', { class: 'tbl' }, h('tr', {}, ...['題號', '題目', '正確答案', '解析', '狀態'].map((x) => h('th', { text: x }))),
    ...d.questions.map((q) => h('tr', {}, h('td', {}, q.questionId.split('-').slice(-1)[0], locked ? null : h('div', { class: 'row' }, h('button', { type: 'button', class: 'btn sm', onclick: () => editQuestion(q, d) }, '編輯'), h('button', { type: 'button', class: 'btn sm danger', onclick: () => { if (confirm('刪除這一題？（這一版還是草稿，可以刪除；已發布的版本不受影響）')) { d.questions.splice(d.questions.indexOf(q), 1); d.assessments.forEach((a) => { a.questionIds = a.questionIds.filter((x) => x !== q.questionId); }); S.save(); draw(); } } }, '刪除'))), h('td', { text: q.questionText }), h('td', {}, q.questionType === 'mc' && !locked ? h('select', { 'aria-label': '正確答案', onchange: (e) => { q.correctAnswer = +e.target.value; q.reviewStatus = 'pending'; S.setItemStatus(state.unitId, [q], 'pending'); draw(); } }, ...(q.correctAnswer < 0 || q.correctAnswer >= q.options.length ? [h('option', { value: -1, selected: true, text: '（請選擇正確答案）' })] : []), ...q.options.map((o, i) => h('option', { value: i, selected: q.correctAnswer === i, text: o }))) : q.questionType === 'tf' && !locked ? h('select', { 'aria-label': '正確答案', onchange: (e) => { q.correctAnswer = e.target.value === 'true'; S.setItemStatus(state.unitId, [q], 'pending'); draw(); } }, ...[['true', '對'], ['false', '錯']].map(([v, n]) => h('option', { value: v, selected: String(q.correctAnswer) === v, text: n }))) : h('span', { text: q.questionType === 'mc' ? (q.options[q.correctAnswer] ?? '？') : JSON.stringify(q.correctAnswer) })), h('td', { text: q.explanation }),
      h('td', {}, h('select', { disabled: locked, 'aria-label': '審核狀態', onchange: (e) => { S.setItemStatus(state.unitId, [q], e.target.value); draw(); } }, ...[['pending', '待審核'], ['approved', '已審核'], ['rejected', '退回'], ['needs_confirmation', '待人工確認']].map(([x, n]) => h('option', { value: x, selected: q.reviewStatus === x, text: n })))))))));
  if (!locked) main.append(h('div', { class: 'card' }, h('h3', { text: '編輯內容' }), h('p', { class: 'note', text: '只有「草稿」「待審核」的版本可以直接編輯；編輯後該項會回到「待審核」。已核准的版本請到「版本」建立新版本再改。' }),
    h('div', { class: 'row' }, h('button', { type: 'button', class: 'btn', onclick: () => editQuestion(null, d) }, '＋ 新增題目'), h('button', { type: 'button', class: 'btn', onclick: () => editLesson(null, d) }, '＋ 新增段落'), h('button', { type: 'button', class: 'btn', onclick: () => editKP(null, d) }, '＋ 新增知識點')),
    d.lessons.length ? h('details', {}, h('summary', { text: `段落與知識點（${d.lessons.length} + ${d.keyPoints.length}）` }), ...d.lessons.map((l) => h('div', { class: 'item' }, h('b', { text: l.title }), ' ', h('button', { type: 'button', class: 'btn sm', onclick: () => editLesson(l, d) }, '編輯'), h('button', { type: 'button', class: 'btn sm danger', onclick: () => { if (confirm('刪除這個段落？')) { d.lessons.splice(d.lessons.indexOf(l), 1); S.save(); draw(); } } }, '刪除'))), ...d.keyPoints.map((k) => h('div', { class: 'item' }, '🎯 ' + k.text, ' ', h('button', { type: 'button', class: 'btn sm', onclick: () => editKP(k, d) }, '編輯')))) : null));
  const rev = h('input', { type: 'text', value: d.version.reviewer || author(), maxlength: 20, 'aria-label': '審核者' });
  const go = (to, label, cls = '') => h('button', { type: 'button', class: 'btn ' + cls, onclick: () => { try { if (to === 'approved' && nErr) throw new Error(`還有 ${nErr} 項格式／語意錯誤（含尚未通過審核的內容），不能核准`); S.transition(state.unitId, to, { reviewer: rev.value.trim(), version: v.number }); toast(`已變更為「${S.STATUSES[to]}」`); } catch (e) { toast(e.message, true); } draw(); } }, label);
  main.append(h('div', { class: 'card' }, h('h3', { text: '狀態轉換' }), h('label', {}, '審核者：', rev),
    h('div', { class: 'row' }, ...S.TRANSITIONS[v.status].filter((t) => t !== 'published').map((t) => go(t, { parsing: '標為解析中', pending_review: v.status === 'draft' ? '送審 →' : '退回待審核', approved: '審核通過 ✔', draft: '退回草稿', archived: '封存', published: '' }[t] + '', t === 'approved' ? 'btn-primary' : ''))),
    h('p', { class: 'note', text: '審核通過的條件：格式與語意檢查沒有錯誤、所有內容都已審核、有審核者。通過後這一版鎖定。發布請到「5 發布」。' })));
}

/* ===== 版本 ===== */
function versions() {
  if (!needUnit()) return; const u = S.getUnit(state.unitId);
  const diff = (a, b) => { if (!a) return '—'; const qa = new Map(a.data.questions.map((q) => [q.questionId, q])), qb = new Map(b.data.questions.map((q) => [q.questionId, q])); let add = 0, del = 0, chg = 0; qb.forEach((q, k) => { if (!qa.has(k)) add++; else if (JSON.stringify(qa.get(k)) !== JSON.stringify(q)) chg++; }); qa.forEach((q, k) => { if (!qb.has(k)) del++; }); return `題目 +${add} −${del} ～${chg}；段落 ${a.data.lessons.length}→${b.data.lessons.length}`; };
  main.append(h('div', { class: 'card' }, h('h2', { text: `版本紀錄：${state.unitId}` }), h('table', { class: 'tbl' }, h('tr', {}, ...['版本', '狀態', '作者', '審核者', '修改摘要', '建立時間', '與前一版差異', ''].map((x) => h('th', { text: x }))),
    ...u.versions.slice().reverse().map((v, i, arr) => { const prev = u.versions.find((x) => x.number === v.data.version.parentVersion); return h('tr', { class: v.number === u.publishedVersion ? 'hl' : '' }, h('td', { text: 'v' + v.number + (v.number === u.publishedVersion ? '（發布中）' : '') }), h('td', {}, badge(v.status)), h('td', { text: v.data.version.author }), h('td', { text: v.data.version.reviewer || '—' }), h('td', { text: v.data.version.summary }), h('td', { text: new Date(v.createdAt).toLocaleString('zh-TW') }), h('td', { text: diff(prev, v) }),
      h('td', {}, h('div', { class: 'row' }, h('button', { type: 'button', class: 'btn sm', onclick: () => { state.ver = v.number; state.tab = 'preview'; draw(); } }, '檢視'),
        h('button', { type: 'button', class: 'btn sm', onclick: () => { const s = prompt('這次修改的摘要（必填）：'); if (!s) return; try { const nv = S.newVersion(state.unitId, () => {}, s, author()); state.ver = nv.number; toast('已建立新版本 v' + nv.number + '（草稿）'); } catch (e) { toast(e.message, true); } draw(); } }, '以此為基礎建立新版'),
        v.data.version.reviewer && v.number !== u.publishedVersion ? h('button', { type: 'button', class: 'btn sm', onclick: () => { if (confirm(`把發布中的版本回復為 v${v.number}？學生的歷史學習紀錄不會被改動。`)) { try { S.rollbackTo(state.unitId, v.number, author()); toast('已回復到 v' + v.number); } catch (e) { toast(e.message, true); } draw(); } } }, '回復發布到此版') : null,
        h('button', { type: 'button', class: 'btn sm', onclick: () => download(`${state.unitId}@v${v.number}.json`, JSON.stringify(v.data, null, 2)) }, '下載 JSON')))); })),
    h('p', { class: 'note', text: '每次更新都新增一個版本，舊版保留；questionId 在各版本間保持不變，所以不會影響學生既有的答題紀錄。' })));
}

/* ===== 發布 ===== */
function publish() {
  if (!needUnit()) return; const u = S.getUnit(state.unitId), v = cur(); const pkg = S.buildPublishPackage(publishedManifest);
  const mErr = schemaManifestErrors(pkg.manifest);
  main.append(h('div', { class: 'card' }, h('h2', { text: `發布：${state.unitId}　v${v.number}` }), h('div', { class: 'row' }, badge(v.status), u.publishedVersion ? h('span', { text: `發布中：v${u.publishedVersion}` }) : h('span', { class: 'note', text: '目前沒有發布中的版本' })),
    h('p', { class: 'note', text: '這個原型不會直接寫入網站。「發布」＝產生要放進專案的檔案（單元 JSON＋manifest）；你把它們放進 content/ 並 commit，網站更新後學生端才會看到。只有「已審核」的版本能發布。' }),
    h('div', { class: 'row' }, v.status === 'approved' ? h('button', { type: 'button', class: 'btn btn-primary', onclick: () => { try { S.transition(state.unitId, 'published', { version: v.number }); toast('已標為發布；請下載發布包'); } catch (e) { toast(e.message, true); } draw(); } }, '發布這一版') : null,
      v.status === 'published' ? h('button', { type: 'button', class: 'btn', onclick: () => { if (confirm('撤回發布？學生端會看不到這個單元（版本資料保留）。')) { S.transition(state.unitId, 'approved', { version: v.number }); toast('已撤回發布'); draw(); } } }, '撤回發布') : null,
      v.status === 'published' ? h('button', { type: 'button', class: 'btn', onclick: () => { S.transition(state.unitId, 'archived', { version: v.number }); toast('已封存'); draw(); } }, '封存') : null),
    !['approved', 'published'].includes(v.status) ? h('p', { class: 'warnline', text: '這一版還不是「已審核」，不能發布。請先到「3 審核」。' }) : null));
  main.append(h('div', { class: 'card' }, h('h3', { text: '發布包' }), mErr.length ? h('ul', {}, ...mErr.map((e) => h('li', { class: 'bad', text: e }))) : h('p', { class: 'ok', text: '✔ manifest 通過格式檢查' }),
    h('p', { class: 'note', text: `會輸出：content/manifest.json，以及 ${pkg.files.length} 個單元檔（每個版本一個，不覆蓋舊版）。` }),
    h('div', { class: 'row' }, h('button', { type: 'button', class: 'btn btn-primary', disabled: !pkg.manifest.units.length || mErr.length, onclick: () => { download('manifest.json', JSON.stringify(pkg.manifest, null, 2)); pkg.files.forEach((f, i) => setTimeout(() => download(f.name, f.text), 300 * (i + 1))); } }, '下載發布包')),
    h('details', {}, h('summary', { text: 'manifest 預覽' }), h('pre', { class: 'pre', text: JSON.stringify(pkg.manifest, null, 2) }))));
}
function schemaManifestErrors(m) { const out = []; if (m.schemaVersion !== 1) out.push('schemaVersion 錯誤'); m.units.forEach((x) => { if (!/^G(1[0-2]|[1-9])-[A-Z]{3,4}-U\d{2}$/.test(x.unitId)) out.push('unitId 格式錯誤：' + x.unitId); if (!['published', 'archived'].includes(x.status)) out.push(x.unitId + ' 狀態不可發布'); }); return out; }

/* ===== 說明 ===== */
function guide() {
  main.append(h('div', { class: 'card' }, h('h2', { text: '流程' }), h('ol', {}, h('li', { text: '匯入：選檔案、年級、科目、單元 → 解析成草稿（來源檔名、頁碼、位置都保留）' }), h('li', { text: '重複檢查：unitId、檔案雜湊、相似題目、是否為新版' }), h('li', { text: '審核：逐項審核；無法辨識的標為「待人工確認」，不會被當成確定內容' }), h('li', { text: '核准：格式／語意檢查通過、全部內容已審核、有審核者' }), h('li', { text: '發布：產生單元 JSON 與 manifest，放進專案後學生端才會出現' }), h('li', { text: '更新／回復：每次更新新增版本；回復＝把發布中的版本指回舊版' }))));
  main.append(h('div', { class: 'card' }, h('h2', { text: '狀態機' }), h('table', { class: 'tbl' }, h('tr', {}, h('th', { text: '目前狀態' }), h('th', { text: '可以變成' })), ...Object.entries(S.TRANSITIONS).map(([k, v]) => h('tr', {}, h('td', {}, badge(k)), h('td', { text: v.map((x) => S.STATUSES[x]).join('、') })))), h('p', { class: 'note', text: '只有「已發布」的版本會出現在學生端。未發布、待審核、已審核但沒發布的內容，學生端一律看不到。' })));
  main.append(h('div', { class: 'card' }, h('h2', { text: '這個原型的限制' }), h('ul', {}, h('li', { text: '資料存在這個瀏覽器（localStorage：adv-cm-v1），換電腦就沒有；請定期用「下載 JSON」備份。' }), h('li', { text: '沒有登入與權限；多位管理者同時使用會互相覆蓋。第二階段改用後端。' }), h('li', { text: 'PDF／DOCX／PPTX 與 AI 解析需要外部服務與後端金鑰管理，尚未連接。' }), h('li', { text: '原始檔不會上傳到任何地方，只記錄名稱、大小與 SHA-256。' }))));
}
/* ===== 編輯器（只能編輯草稿／待審核的版本） ===== */
function modal(title, bodyNodes, onSave) {
  const ov = h('div', { class: 'modal', role: 'dialog', 'aria-label': title });
  const close = () => ov.remove();
  ov.append(h('div', { class: 'modal-box' }, h('h2', { text: title }), ...bodyNodes, h('div', { class: 'row' }, h('button', { type: 'button', class: 'btn btn-primary', onclick: () => { try { onSave(); close(); } catch (e) { toast(e.message, true); } } }, '儲存'), h('button', { type: 'button', class: 'btn', onclick: close }, '取消'))));
  document.body.append(ov);
}
const field = (label, node) => h('label', { class: 'fld' }, h('span', { text: label }), node);
const ta = (v, rows = 3) => h('textarea', { rows }, v || '');
const lines = (s) => s.split(String.fromCharCode(10)).map((x) => x.trim()).filter(Boolean);
const nl = String.fromCharCode(10);
function fmtAnswer(q) {
  const a = q.correctAnswer;
  if (q.questionType === 'mc') return String(a + 1);
  if (q.questionType === 'tf') return a ? '對' : '錯';
  if (q.questionType === 'fill' || q.questionType === 'order') return (a || []).join(nl);
  if (q.questionType === 'match') return (a || []).map((p) => p.join('=')).join(nl);
  if (q.questionType === 'short') return (a && a.reference) || '';
  return JSON.stringify(a);
}
function parseAnswer(type, raw, optionLines) {
  const t = raw.trim();
  if (type === 'mc') { const n = /^[0-9]+$/.test(t) ? +t - 1 : optionLines.indexOf(t); return n; }
  if (type === 'tf') return /^(對|正確|true|是|1)$/i.test(t);
  if (type === 'fill' || type === 'order') return lines(raw);
  if (type === 'match') return lines(raw).map((l) => l.split('=').map((x) => x.trim()));
  if (type === 'short') return { reference: t, keywords: [] };
  return JSON.parse(raw || 'null');
}
function editQuestion(q, d) {
  const isNew = !q; const type = q ? q.questionType : 'mc'; const T = h('select', { disabled: !isNew }, ...[['mc', '選擇題'], ['tf', '是非題'], ['fill', '填充題'], ['match', '配合題'], ['short', '簡答題'], ['order', '排序題'], ['sort', '分類題']].map(([v, n]) => h('option', { value: v, selected: v === type, text: n })));
  const diff = h('select', {}, ...[[1, '基礎'], [2, '進階'], [3, '精熟']].map(([v, n]) => h('option', { value: v, selected: q ? q.difficulty === v : v === 1, text: n })));
  const kp = h('select', {}, ...d.keyPoints.map((k) => h('option', { value: k.knowledgePointId, selected: q && q.knowledgePointId === k.knowledgePointId, text: k.text })));
  const text = ta(q && q.questionText, 3);
  const jsonType = (t) => t === 'sort';
  const opts = ta(q ? (jsonType(type) ? JSON.stringify(q.options) : (Array.isArray(q.options) ? q.options.join(nl) : '')) : '', 4);
  const ans = ta(q ? fmtAnswer(q) : '', 3); const exp = ta(q && q.explanation, 3); const page = h('input', { type: 'number', min: 1, value: q && q.sourcePage ? q.sourcePage : '' });
  const hint = h('p', { class: 'note', text: '選項：一行一個。答案：選擇題填選項編號（1 開始）或選項文字；是非題填「對」或「錯」；填充題一行一個答案；配合題一行一組「左=右」；排序題依正確順序一行一個；分類題用 JSON。' });
  modal(isNew ? '新增題目' : '編輯題目', [field('題型', T), field('難度', diff), field('知識點', kp), field('題目', text), field('選項', opts), field('正確答案', ans), hint, field('解析', exp), field('來源頁碼（不知道就留空）', page)], () => {
    if (!d.keyPoints.length) throw new Error('請先新增至少一個知識點');
    const ty = T.value; const optLines = jsonType(ty) ? null : lines(opts.value); let options; if (jsonType(ty)) options = JSON.parse(opts.value || 'null'); else options = ty === 'tf' ? ['○ 正確', '✕ 錯誤'] : optLines;
    if (!text.value.trim()) throw new Error('題目不可為空');
    const answer = parseAnswer(ty, ans.value, optLines || []);
    const n = d.questions.reduce((m, x) => Math.max(m, +(/Q(\d+)$/.exec(x.questionId) || [0, 0])[1]), 0);
    const nq = { questionId: q ? q.questionId : `${d.unitId}-Q${A.pad(n + 1, 3)}`, unitId: d.unitId, knowledgePointId: kp.value, questionType: ty, difficulty: +diff.value, questionText: text.value.trim(), options, correctAnswer: answer, explanation: exp.value.trim(), sourceFile: q ? q.sourceFile : '手動輸入', sourcePage: page.value ? +page.value : null, reviewStatus: 'pending' };
    if (q) { Object.keys(q).forEach((k) => { if (!(k in nq) && ['legacyRef', 'table', 'answerAnyOrder'].includes(k)) nq[k] = q[k]; }); nq.revision = (q.revision || 1) + 1; Object.keys(q).forEach((k) => delete q[k]); Object.assign(q, nq); } else d.questions.push(nq);
    d.updatedAt = A.nowIso(); S.save(); draw();
  });
}
function editLesson(l, d) {
  const title = h('input', { type: 'text', value: l ? l.title : '' }); const body = ta(l && l.blocks && l.blocks[0] ? l.blocks[0].text : '', 6);
  modal(l ? '編輯段落' : '新增段落', [l && l.ref ? h('p', { class: 'note', text: `這個段落引用既有教材（${l.ref.page} 節點 ${l.ref.nodeId}），內容仍在原頁面；這裡只改標題。` }) : null, field('標題', title), l && l.ref ? null : field('內容', body)].filter(Boolean), () => {
    if (!title.value.trim()) throw new Error('標題不可為空');
    if (l) { l.title = title.value.trim(); if (!l.ref) l.blocks = [{ type: 'text', text: body.value }]; l.reviewStatus = 'pending'; }
    else d.lessons.push({ lessonId: `${d.unitId}-L${A.pad(d.lessons.length + 1)}`, title: title.value.trim(), order: d.lessons.length + 1, blocks: [{ type: 'text', text: body.value }], keyPointIds: [], source: { fileName: '手動輸入' }, reviewStatus: 'pending' });
    d.updatedAt = A.nowIso(); S.save(); draw();
  });
}
function editKP(k, d) {
  const text = h('input', { type: 'text', value: k ? k.text : '' });
  modal(k ? '編輯知識點' : '新增知識點', [field('知識點名稱', text)], () => {
    if (!text.value.trim()) throw new Error('名稱不可為空');
    if (k) { k.text = text.value.trim(); k.reviewStatus = 'pending'; } else d.keyPoints.push({ knowledgePointId: `${d.unitId}-KP-${A.pad(d.keyPoints.length + 1)}`, text: text.value.trim(), source: { fileName: '手動輸入' }, reviewStatus: 'pending' });
    d.updatedAt = A.nowIso(); S.save(); draw();
  });
}
init();
