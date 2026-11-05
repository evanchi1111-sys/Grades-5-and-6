/* 學習分析與匯出（家長模式、老師模式共用）
 * 只使用這台裝置上的紀錄；錯題分析以「知識標籤」為單位，不只是統計答錯題數。 */
import { CATALOG, LOADERS } from '../data/index.js';
import { TAGS } from '../data/tags.js';
import * as R from '../store/records.js';

export async function loadUnits() {
  const out = {};
  for (const c of CATALOG) if (LOADERS[c.id]) { try { out[c.id] = (await LOADERS[c.id]()).default; } catch (e) { /* 單元載入失敗就略過 */ } }
  return out;
}

export function remedyLink(unit, tag) {
  const t = TAGS[tag]; if (!t) return null;
  const q = new URLSearchParams({ id: unit.id, step: t.remedy.step });
  if (t.remedy.step === 'lab') q.set('act', t.remedy.act); else q.set('node', t.remedy.node);
  return 'unit.html?' + q;
}

/* 單一單元分析。rec 可以是 null（還沒開始）。 */
export function analyze(unit, rec) {
  const r = { unit, started: !!rec, completed: !!(rec && rec.completedAt), steps: rec ? Object.keys(rec.steps || {}) : [], timeSec: rec ? rec.timeSec || 0 : 0,
    labs: rec ? Object.keys(rec.labs || {}) : [], tests: rec ? rec.tests || [] : [], bestTest: 0, lastTest: null, tags: [], wrong: [], practice: rec ? rec.practice || {} : {}, tutor: rec && rec.tutor ? rec.tutor : { total: 0, byKind: {} }, badges: rec ? rec.badges || [] : [], attempts: rec ? (rec.attempts || []).length : 0, accuracy: null };
  if (!rec) return r;
  r.bestTest = r.tests.reduce((m, t) => Math.max(m, t.percent), 0); r.lastTest = r.tests[r.tests.length - 1] || null;
  const att = rec.attempts || []; if (att.length) r.accuracy = Math.round((att.filter((a) => a.ok).length / att.length) * 100);
  const byTag = {};
  att.forEach((a) => { const t = (byTag[a.tag] = byTag[a.tag] || { n: 0, ok: 0, last: [] }); t.n++; if (a.ok) t.ok++; t.last.push(a.ok); });
  r.tags = Object.keys(byTag).filter((k) => TAGS[k]).map((k) => {
    const t = byTag[k], pct = Math.round((t.ok / t.n) * 100), last2 = t.last.slice(-2), last2Wrong = last2.length >= 2 && last2.every((x) => !x);
    const state = t.n < 2 ? (t.ok === 0 ? '待加強' : '資料不足') : last2Wrong || pct < 60 ? '不熟' : pct < 80 ? '待加強' : '熟悉'; // 只做過 1 次且答錯，也列為待加強
    return { tag: k, name: TAGS[k].name, n: t.n, ok: t.ok, pct, last2Wrong, state, link: remedyLink(unit, k) };
  }).sort((a, b) => ({ 不熟: 0, 待加強: 1, 資料不足: 2, 熟悉: 3 }[a.state] - { 不熟: 0, 待加強: 1, 資料不足: 2, 熟悉: 3 }[b.state]) || a.pct - b.pct);
  const byQ = {};
  att.forEach((a) => { const x = (byQ[a.qid] = byQ[a.qid] || { qid: a.qid, tag: a.tag, wrongs: 0, lastOk: true, lastT: 0 }); if (!a.ok) x.wrongs++; x.lastOk = a.ok; x.lastT = a.t; });
  r.wrong = Object.values(byQ).filter((x) => x.wrongs > 0).map((x) => ({ ...x, q: unit.questions.find((q) => q.id === x.qid) })).filter((x) => x.q).sort((a, b) => Number(a.lastOk) - Number(b.lastOk) || b.lastT - a.lastT);
  return r;
}

export const fmtDur = (s) => (s < 60 ? '不到 1 分鐘' : Math.round(s / 60) + ' 分鐘');
const fmtDate = (t) => (t ? new Date(t).toLocaleString('zh-TW') : '—');
const unitName = (u) => `${u.grade === 5 ? '五' : '六'}年級${u.subject}第 ${u.unitNo} 單元 ${u.title}`;

/* 文字版學習報告（可複製、下載、列印） */
export function reportText(profile, analyses) {
  const L = [`學習報告：${profile}`, `產生時間：${new Date().toLocaleString('zh-TW')}`, '資料來源：這台裝置上的瀏覽器紀錄（不會上傳、不跨裝置同步）。', '內容狀態：教材與題目為「待審核」。', ''];
  analyses.forEach((a) => {
    L.push(`■ ${unitName(a.unit)}`);
    if (!a.started) { L.push('  還沒開始。', ''); return; }
    L.push(`  狀態：${a.completed ? '已通關' : '學習中'}；完成步驟 ${a.steps.length} 個；學習時間約 ${fmtDur(a.timeSec)}`);
    L.push(`  單元測驗：${a.tests.length ? `${a.tests.length} 次，最高 ${a.bestTest}%，最近一次 ${a.lastTest.score}/${a.lastTest.total}` : '還沒有'}`);
    L.push(`  完成的實驗：${a.labs.length ? a.labs.map((k) => (a.unit.labs.find((l) => l.id === k) || { title: k }).title).join('、') : '還沒有'}`);
    if (a.accuracy != null) L.push(`  作答正確率：${a.accuracy}%（共 ${a.attempts} 次作答）`);
    const weak = a.tags.filter((t) => t.state === '不熟' || t.state === '待加強');
    if (weak.length) { L.push('  需要加強的觀念：'); weak.forEach((t) => L.push(`    - ${t.name}（${t.state}，答對 ${t.ok}/${t.n}${t.last2Wrong ? '，連續答錯' : ''}）`)); }
    else if (a.tags.length) L.push('  各知識點目前都還不錯。');
    if (a.wrong.some((w) => !w.lastOk)) { L.push('  還沒答對的題目：'); a.wrong.filter((w) => !w.lastOk).slice(0, 8).forEach((w) => L.push(`    - ${w.q.q}（正確答案：${w.q.opts[w.q.answer]}）`)); }
    L.push('');
  });
  return L.join('\n');
}

export function download(name, text, mime = 'text/plain') {
  const blob = new Blob([text], { type: mime + ';charset=utf-8' }); const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name; document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
export { fmtDate, unitName };
