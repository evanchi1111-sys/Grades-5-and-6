/* 匯入轉接器（parser adapters）
 * 每個 adapter 只做一件事：把檔案轉成「單元資料的片段（patch）」，所有結果預設為待審核，無法辨識的標為 needs_confirmation。
 * 需要外部服務才能解析的格式（PDF／DOCX／PPTX／掃描圖片 OCR）只登記為 external，不把解析邏輯寫死在管理頁；
 * 外部服務回傳的標準格式是 { pages: [ { page, blocks: [ { type, text, bbox? } ] } ] }，用 fromPages() 轉成草稿。 */
import { LOADERS } from '../science/data/index.js';
import { TAGS } from '../science/data/tags.js';

export const nowIso = () => new Date().toISOString();
export const pad = (n, w = 2) => String(n).padStart(w, '0');
export const SUBJECTS = { CHI: '國語', MAT: '數學', SOC: '社會', NAT: '自然' };
export const makeUnitId = (grade, subject, no) => `G${grade}-${subject}-U${pad(no)}`;

export async function sha256(buf) { const d = await crypto.subtle.digest('SHA-256', buf); return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join(''); }

export function skeleton({ grade, subject, subjectName, unitNumber, unitTitle, textbookVersion = '未標示', author = '管理者', summary = '建立草稿' }) {
  const t = nowIso();
  return { schemaVersion: 1, unitId: makeUnitId(grade, subject, unitNumber), grade, subject, subjectName: subjectName || SUBJECTS[subject] || subject, unitNumber, unitTitle, textbookVersion,
    learningObjectives: [], sourceFiles: [], lessons: [], keyPoints: [], illustrations: [], experiments: [], examples: [], questions: [], assessments: [], explanations: [], commonMistakes: [], achievements: [],
    reviewStatus: 'draft', version: { number: 1, createdAt: t, summary, author, reviewer: null, reviewedAt: null, parentVersion: null, publishedAt: null }, createdAt: t, updatedAt: t };
}

export async function fileRecord(file, role = 'original', parser = '') {
  const buf = await file.arrayBuffer(); const hash = await sha256(buf);
  return { buf, rec: { fileId: 'F-' + hash.slice(0, 10), fileName: file.name, mimeType: file.type || guessMime(file.name), sizeBytes: file.size, sha256: hash, role, uploadedAt: nowIso(), parser } };
}
const guessMime = (n) => ({ pdf: 'application/pdf', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', txt: 'text/plain', json: 'application/json', csv: 'text/csv' }[(n.split('.').pop() || '').toLowerCase()] || 'application/octet-stream');

/* ---- 小工具 ---- */
export function parseCSV(text) {
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) { const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true; else if (c === ',') { row.push(cur); cur = ''; } else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cur); cur = ''; if (row.some((x) => x !== '')) rows.push(row); row = []; } else cur += c; }
  if (cur !== '' || row.length) { row.push(cur); if (row.some((x) => x !== '')) rows.push(row); }
  return rows;
}
const TYPE_MAP = { mc: 'mc', 選擇: 'mc', 選擇題: 'mc', tf: 'tf', 是非: 'tf', 是非題: 'tf', fill: 'fill', 填充: 'fill', 填充題: 'fill', match: 'match', 配合: 'match', 配合題: 'match', short: 'short', 簡答: 'short', 簡答題: 'short' };

/* ---- adapters ---- */
export const ADAPTERS = [
  { id: 'json', name: 'JSON（單元或題庫）', exts: ['json'], kind: 'built-in',
    async parse(file, text, ctx) {
      let j; try { j = JSON.parse(text); } catch (e) { return { notes: ['JSON 格式錯誤：' + e.message], errors: true }; }
      if (j && j.schemaVersion && j.unitId) return { fullUnit: j, notes: ['這是完整的單元 JSON，會直接進入檢查流程。'] };
      if (Array.isArray(j)) return { patch: { questions: j.map((q) => normalizeQuestion(q, ctx)) }, notes: [`題庫 JSON：${j.length} 題`] };
      return { notes: ['不是單元 JSON 也不是題庫陣列。'], errors: true };
    } },
  { id: 'csv-questions', name: 'CSV 題庫', exts: ['csv'], kind: 'built-in',
    async parse(file, text, ctx) {
      const rows = parseCSV(text.replace(/^﻿/, '')); if (rows.length < 2) return { notes: ['CSV 沒有資料列'], errors: true };
      const h = rows[0].map((x) => x.trim()); const ix = (...names) => h.findIndex((x) => names.includes(x));
      const col = { type: ix('questionType', '題型'), diff: ix('difficulty', '難度'), kp: ix('knowledgePointId', 'knowledgePoint', '知識點'), q: ix('questionText', '題目'), opts: ix('options', '選項'), ans: ix('correctAnswer', '答案'), exp: ix('explanation', '解析'), page: ix('sourcePage', '頁碼') };
      const need = ['q', 'ans'].filter((k) => col[k] < 0); if (need.length) return { notes: ['CSV 缺少必要欄位：questionText（題目）、correctAnswer（答案）'], errors: true };
      const notes = []; const qs = rows.slice(1).map((r, i) => {
        const type = TYPE_MAP[(r[col.type] || 'mc').trim()] || 'mc'; const opts = col.opts >= 0 ? (r[col.opts] || '').split('|').map((x) => x.trim()).filter(Boolean) : [];
        const raw = (r[col.ans] || '').trim(); let ans = raw, status = 'pending';
        if (type === 'mc') { const n = /^\d+$/.test(raw) ? +raw - 1 : opts.findIndex((o) => o === raw); ans = n; if (n < 0) { status = 'needs_confirmation'; notes.push(`第 ${i + 2} 列：找不到答案對應的選項，標為待人工確認`); } }
        else if (type === 'tf') { ans = /^(true|對|正確|○|是|t|1)$/i.test(raw) ? true : /^(false|錯|錯誤|✕|否|f|0)$/i.test(raw) ? false : null; if (ans === null) { status = 'needs_confirmation'; notes.push(`第 ${i + 2} 列：是非題答案無法辨識`); } }
        else if (type === 'fill') ans = raw.split('|').map((x) => x.trim()); else if (type === 'match') ans = raw.split('|').map((p) => p.split('=').map((x) => x.trim())); else if (type === 'short') ans = { reference: raw, keywords: [] };
        return normalizeQuestion({ questionType: type, difficulty: +(r[col.diff] || 1) || 1, knowledgePointId: (r[col.kp] || '').trim(), questionText: (r[col.q] || '').trim(), options: opts, correctAnswer: ans, explanation: (r[col.exp] || '').trim(), sourcePage: col.page >= 0 && r[col.page] ? +r[col.page] : null, reviewStatus: status }, ctx);
      });
      return { patch: { questions: qs }, notes: [`CSV 題庫：${qs.length} 題。欄位：${h.join('、')}`, ...notes] };
    } },
  { id: 'txt', name: '純文字', exts: ['txt'], kind: 'built-in',
    async parse(file, text, ctx) {
      const paras = text.replace(/\r/g, '').split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
      const lessons = paras.map((p, i) => { const lines = p.split('\n'); const head = /^(#+\s*|[一二三四五六七八九十]+、|第.{1,3}[章節課單元])/.test(lines[0]) && lines.length > 1; return { lessonId: `${ctx.unitId}-L${pad(i + 1)}`, title: head ? lines[0].replace(/^#+\s*/, '') : `段落 ${i + 1}`, order: i + 1, blocks: [{ type: 'text', text: (head ? lines.slice(1) : lines).join('\n') }], keyPointIds: [], source: { fileId: ctx.fileId, fileName: file.name, locator: `第 ${i + 1} 段` }, reviewStatus: 'needs_confirmation' }; });
      return { patch: { lessons }, notes: [`純文字：切成 ${lessons.length} 個段落草稿（全部標為待人工確認，需人工分類成知識重點）。`] };
    } },
  { id: 'image', name: '圖片（JPG／PNG）', exts: ['jpg', 'jpeg', 'png'], kind: 'built-in',
    async parse(file, text, ctx) {
      let dim = ''; try { const bm = await createImageBitmap(file); dim = `${bm.width}×${bm.height}`; bm.close && bm.close(); } catch (e) { /* 無法讀取尺寸 */ }
      return { patch: { illustrations: [{ illustrationId: `${ctx.unitId}-I${pad(ctx.seq, 3)}`, caption: '待人工確認', alt: '待人工確認', fileId: ctx.fileId, credit: '', source: { fileId: ctx.fileId, fileName: file.name }, reviewStatus: 'needs_confirmation' }] }, notes: [`圖片 ${dim}：已建立圖片資料，說明文字與授權來源需人工填寫（不做自動辨識）。`] };
    } },
  { id: 'external-pdf', name: 'PDF（需外部解析服務）', exts: ['pdf'], kind: 'external', note: '掃描頁、圖表、實驗照片需要 OCR／版面分析，必須由獨立的解析服務處理並回傳 pages 格式。' },
  { id: 'external-docx', name: 'DOCX（需外部解析服務）', exts: ['docx'], kind: 'external', note: '需要 Word 文件解析服務。' },
  { id: 'external-pptx', name: 'PPTX（需外部解析服務）', exts: ['pptx'], kind: 'external', note: '需要簡報解析服務（保留投影片頁碼）。' },
];
export const adapterFor = (name) => { const ext = (name.split('.').pop() || '').toLowerCase(); return ADAPTERS.find((a) => a.exts.includes(ext)) || null; };

export function normalizeQuestion(q, ctx) {
  return { questionId: q.questionId || '', unitId: ctx.unitId, knowledgePointId: q.knowledgePointId || '', questionType: q.questionType || 'mc', difficulty: q.difficulty || 1, questionText: q.questionText || '', options: q.options || [], correctAnswer: q.correctAnswer, explanation: q.explanation || '', sourceFile: q.sourceFile || ctx.fileName || '', sourcePage: q.sourcePage ?? null, reviewStatus: q.reviewStatus || 'pending' };
}

/* 外部解析服務的標準輸出 → 草稿 lessons／questions（保留頁碼與位置） */
export function fromPages(parsed, ctx) {
  const lessons = [], questions = [], illustrations = []; let n = 0;
  (parsed.pages || []).forEach((pg) => (pg.blocks || []).forEach((b, bi) => {
    const src = { fileId: ctx.fileId, fileName: ctx.fileName, page: pg.page, locator: b.locator || `第 ${pg.page} 頁第 ${bi + 1} 個區塊` };
    if (b.type === 'image') illustrations.push({ illustrationId: `${ctx.unitId}-I${pad(illustrations.length + 1, 3)}`, caption: b.text || '待人工確認', alt: b.alt || '待人工確認', fileId: ctx.fileId, bbox: b.bbox, credit: '', source: src, reviewStatus: 'needs_confirmation' });
    else if (b.type === 'question') questions.push(normalizeQuestion({ ...b.question, sourcePage: pg.page, sourceFile: ctx.fileName, reviewStatus: 'needs_confirmation' }, ctx));
    else { n++; lessons.push({ lessonId: `${ctx.unitId}-L${pad(n)}`, title: b.type === 'heading' ? b.text : `第 ${pg.page} 頁內容 ${n}`, order: n, blocks: [{ type: 'text', text: b.text }], keyPointIds: [], source: src, reviewStatus: 'needs_confirmation' }); }
  }));
  return { lessons, questions, illustrations };
}

/* 讀取原教材節點（唯讀）。管理頁放在網站根目錄，所以路徑直接用頁面名稱。 */
async function loadOriginal(page) {
  const res = await fetch(page, { cache: 'no-cache' }); if (!res.ok) throw new Error('HTTP ' + res.status);
  const t = await res.text(); const a = t.indexOf('var L=['), b = t.indexOf('\n];', a); if (a < 0 || b < 0) throw new Error('找不到教材資料');
  return new Function('return (' + t.slice(a + 6, b + 2) + ')')();
}

/* ---- 既有 science 單元 → 新格式（唯讀轉換；不修改原資料） ---- */
export const LEGACY_IDS = Object.keys(LOADERS);
export async function legacyToUnit(id, author = 'legacy-adapter') {
  const U = (await LOADERS[id]()).default; const unitId = makeUnitId(U.grade, 'NAT', U.unitNo); const t = nowIso();
  const page = U.source.page; const res = await fetch(page).catch(() => null); const buf = res && res.ok ? await res.arrayBuffer() : new ArrayBuffer(0); const hash = await sha256(buf);
  const fileId = 'F-legacy-' + hash.slice(0, 8); const sourceFiles = [{ fileId, fileName: page, mimeType: 'text/html', sizeBytes: buf.byteLength, sha256: hash, role: 'legacy', uploadedAt: t, storagePath: page, parser: 'legacy-science-adapter@1' }];
  let nodes = []; try { nodes = await loadOriginal(page); } catch (e) { /* 讀不到原教材 */ }
  const usedTags = [...new Set(U.questions.map((q) => q.tag))]; const kpId = (tag) => `${unitId}-KP-${tag}`;
  const lessons = U.source.nodes.map((nid, i) => { const n = nodes.find((x) => x.id === nid) || {}; return { lessonId: `${unitId}-L-${nid}`, title: n.name || nid, order: i + 1, ref: { page, nodeId: nid }, keyPointIds: usedTags.filter((tg) => (TAGS[tg].remedy.step === 'lesson' && TAGS[tg].remedy.node === nid) || (TAGS[tg].remedy.step === 'lab' && (U.labs.find((l) => l.id === TAGS[tg].remedy.act) || {}).node === nid)).map(kpId), source: { fileId, fileName: page, legacyRef: `${page}#${nid}` }, reviewStatus: 'pending' }; });
  const keyPoints = usedTags.map((tg) => { const r = TAGS[tg].remedy; return { knowledgePointId: kpId(tg), text: TAGS[tg].name, remedy: r.step === 'lab' ? { type: 'experiment', targetId: `${unitId}-E-${r.act}` } : { type: 'lesson', targetId: `${unitId}-L-${r.node}` }, source: { fileName: 'science/data/tags.js', legacyRef: tg }, reviewStatus: 'pending' }; });
  const experiments = U.labs.map((l) => ({ experimentId: `${unitId}-E-${l.id}`, title: l.title, objective: l.objective, steps: l.steps, conditions: l.conditions, observe: l.observe, principle: l.principle, conclusion: l.conclusion, safety: l.safety, modelAssumptions: l.model.assumptions, modelLimits: l.model.limits, activityRef: `science/activities/${l.id}.js`, source: { fileName: page, legacyRef: `${page}#${l.node}` }, reviewStatus: 'pending' }));
  const examples = U.demo.map((d, i) => ({ exampleId: `${unitId}-X${pad(i + 1)}`, title: d.title, kind: d.kind, problem: d.problem, steps: d.steps, source: { fileName: page, legacyRef: d.source }, reviewStatus: 'pending' }));
  const commonMistakes = U.demo.filter((d) => d.kind === '易混淆').flatMap((d) => d.steps.map((s, i) => ({ mistakeId: `${unitId}-M${pad(i + 1)}`, text: s.replace(/^•\s*/, ''), source: { fileName: page, legacyRef: d.source }, reviewStatus: 'pending' })));
  const questions = U.questions.map((q, i) => ({ questionId: `${unitId}-Q${pad(i + 1, 3)}`, unitId, knowledgePointId: kpId(q.tag), questionType: 'mc', difficulty: q.level, questionText: q.q, options: q.opts, correctAnswer: q.answer, explanation: q.explain, sourceFile: page, sourcePage: null, legacyRef: `${id}:${q.id}`, reviewStatus: 'pending' }));
  return { schemaVersion: 1, unitId, grade: U.grade, subject: 'NAT', subjectName: '自然', unitNumber: U.unitNo, unitTitle: U.title, textbookVersion: '未標示', learningObjectives: U.goals, sourceFiles, lessons, keyPoints, illustrations: [], experiments, examples, questions,
    assessments: [{ assessmentId: `${unitId}-A01`, title: '單元測驗', questionIds: questions.map((q) => q.questionId), total: U.test.total, perLevel: U.test.perLevel, passPercent: U.test.passPercent }], explanations: [], commonMistakes,
    achievements: U.achievements.map((a) => ({ id: a.id, name: a.name, desc: a.desc, icon: a.icon, rule: a.rule })), reviewStatus: 'draft',
    version: { number: 1, createdAt: t, summary: `由既有 science 單元「${id}」轉換（唯讀，原資料未更動）`, author, reviewer: null, reviewedAt: null, parentVersion: null, publishedAt: null }, createdAt: t, updatedAt: t };
}

/* ---- 重複檢查 ---- */
const grams = (s) => { const t = String(s).replace(/[\s，。、？！：；「」（）()]/g, ''); const set = new Set(); for (let i = 0; i < t.length - 1; i++) set.add(t.slice(i, i + 2)); return set; };
export function similarity(a, b) { const x = grams(a), y = grams(b); if (!x.size || !y.size) return 0; let n = 0; x.forEach((g) => { if (y.has(g)) n++; }); return n / (x.size + y.size - n); }
