/* 既有刷題題庫（index.html）→ 單元（唯讀；不修改、不複製進原系統）
 * 題庫是 index.html 內「一行一題」的函式呼叫。這裡用自己的收集函式執行同一行，取得題目資料；原檔案完全不動。
 * 題目 id 用與原系統相同的雜湊算法，寫入 legacyRef，之後可一對一對應。 */
import { makeUnitId, nowIso, pad, sha256 } from './adapters.js';

const bankHash = (s) => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return 'q' + (h >>> 0).toString(36); };
const CALL = /^(?:mc|tf|fill|match|order|sorting)\((\d+),/;
const UNIT_LINE = /^\s*(\d+):\{subj:(["'])(.*?)\2,name:(["'])(.*?)\4,short:(["'])(.*?)\6,topics:\[(.*?)\]/;

export async function bankIndex() {
  const res = await fetch('index.html', { cache: 'no-cache' }); if (!res.ok) throw new Error('讀不到 index.html'); const text = await res.text();
  const lines = text.split('\n'); const counts = {};
  lines.forEach((l) => { const m = CALL.exec(l); if (m) counts[m[1]] = (counts[m[1]] || 0) + 1; });
  const units = [];
  lines.forEach((l) => { const m = UNIT_LINE.exec(l); if (m) units.push({ u: +m[1], subj: m[3], name: m[5], short: m[7], topics: [...m[8].matchAll(/["']([^"']+)["']/g)].map((x) => x[1]), count: counts[m[1]] || 0 }); });
  return { lines, text, units };
}
export function bankSubject(subj) { const grade = subj.startsWith('五年級') ? 5 : 6; const name = subj.replace('五年級', ''); const code = { 國語: 'CHI', 數學: 'MAT', 社會: 'SOC', 自然: 'NAT' }[name]; return { grade, code, name }; }

export async function legacyBankUnit(idx, u, { unitNumber, extraFiles = [], author = '管理者' } = {}) {
  const info = idx.units.find((x) => x.u === u); if (!info) throw new Error('找不到題庫單元 ' + u);
  const { grade, code, name } = bankSubject(info.subj); if (!code) throw new Error('無法判斷科目：' + info.subj);
  const unitId = makeUnitId(grade, code, unitNumber); const t = nowIso();
  const rows = idx.lines.filter((l) => { const m = CALL.exec(l); return m && +m[1] === u; });
  const got = []; const col = (type) => (...a) => got.push({ type, a });
  rows.forEach((l) => { try { new Function('mc', 'tf', 'fill', 'match', 'order', 'sorting', l)(col('mc'), col('tf'), col('fill'), col('match'), col('order'), col('sort')); } catch (e) { /* 單行無法執行就略過，並在報告中計數 */ } });
  const kpId = (i) => `${unitId}-KP-${pad(i + 1)}`;
  const keyPoints = info.topics.map((tx, i) => ({ knowledgePointId: kpId(i), text: tx, source: { fileName: 'index.html', legacyRef: `u=${u}&t=${i}` }, reviewStatus: 'pending' }));
  const questions = got.map((g, i) => {
    const tt = g.a[1], lv = g.a[2];
    let q = { questionId: `${unitId}-Q${pad(i + 1, 3)}`, unitId, knowledgePointId: kpId(Math.max(0, Math.min(info.topics.length - 1, tt))), difficulty: lv, sourceFile: 'index.html', sourcePage: null, reviewStatus: 'pending' };
    const text = g.a[3];
    if (g.type === 'mc') { const [, , , , opts, ans, exp, tbl] = g.a; q = { ...q, questionType: 'mc', questionText: text, options: opts, correctAnswer: ans, explanation: exp, ...(tbl ? { table: tbl } : {}) }; }
    if (g.type === 'tf') { const [, , , , v, exp] = g.a; q = { ...q, questionType: 'tf', questionText: text, options: ['○ 正確', '✕ 錯誤'], correctAnswer: !!v, explanation: exp }; }
    if (g.type === 'fill') { const [, , , , chips, ans, exp, any] = g.a; q = { ...q, questionType: 'fill', questionText: text, options: chips, correctAnswer: ans, explanation: exp, ...(any ? { answerAnyOrder: true } : {}) }; }
    if (g.type === 'match') { const [, , , , pairs, exp] = g.a; q = { ...q, questionType: 'match', questionText: text, options: [], correctAnswer: pairs, explanation: exp }; }
    if (g.type === 'order') { const [, , , , items, exp] = g.a; q = { ...q, questionType: 'order', questionText: text, options: [], correctAnswer: items, explanation: exp }; }
    if (g.type === 'sort') { const [, , , , buckets, items, exp] = g.a; q = { ...q, questionType: 'sort', questionText: text, options: { buckets, items: items.map((x) => x[0]) }, correctAnswer: items.map((x) => x[1]), explanation: exp }; }
    q.legacyRef = `index.html#${bankHash(g.type + text)}`; return q;
  });
  const files = [{ path: 'index.html', buf: new TextEncoder().encode(idx.text).buffer }];
  for (const pth of extraFiles) { try { const r = await fetch(pth); if (r.ok) files.push({ path: pth, buf: await r.arrayBuffer() }); } catch (e) { /* 找不到就略過 */ } }
  const sourceFiles = [];
  for (const f of files) { const h = await sha256(f.buf); sourceFiles.push({ fileId: 'F-legacy-' + h.slice(0, 8), fileName: f.path, mimeType: f.path.endsWith('.pdf') ? 'application/pdf' : 'text/html', sizeBytes: f.buf.byteLength, sha256: h, role: 'legacy', uploadedAt: t, storagePath: f.path, parser: 'legacy-bank-adapter@1' }); }
  const unit = { schemaVersion: 1, unitId, grade, subject: code, subjectName: name, unitNumber, unitTitle: info.name, textbookVersion: '未標示', learningObjectives: [], sourceFiles, lessons: [], keyPoints, illustrations: [], experiments: [], examples: [], questions,
    assessments: [{ assessmentId: `${unitId}-A01`, title: '單元測驗（沿用既有刷題規則）', questionIds: questions.map((q) => q.questionId), total: Math.min(10, questions.length), passPercent: 60 }], explanations: [], commonMistakes: [], achievements: [], reviewStatus: 'draft',
    version: { number: 1, createdAt: t, summary: `由既有刷題題庫 u=${u}（${info.short}）轉入，共 ${questions.length} 題（唯讀，原題庫未更動）`, author, reviewer: null, reviewedAt: null, parentVersion: null, publishedAt: null }, createdAt: t, updatedAt: t };
  return { unit, skipped: rows.length - got.length, info };
}
