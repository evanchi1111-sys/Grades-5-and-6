/* Content Loader：從「已發布清單」取得教材，並轉成 science 模組使用的執行格式（反向轉接器）。
 * 規則：
 *  - 只讀 content/manifest.json 列出的單元，且 status 必須是 published；其他一律當作不存在。
 *  - 單元內容只取 reviewStatus 為 approved 的項目（未審核的不會出現在學生端）。
 *  - 各模組只用 unitId 取教材，不各自複製資料。
 *  - 讀不到清單或單元時回傳空結果，不影響既有（舊格式）單元。 */
import { TAGS } from '../data/tags.js';

const ROOT = new URL('../../', import.meta.url).href; // 網站根目錄（本檔在 science/content/ 底下）
let manifestPromise = null;

export function fetchManifest() {
  if (!manifestPromise) manifestPromise = fetch(ROOT + 'content/manifest.json', { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  return manifestPromise;
}
export async function listPublished() {
  const m = await fetchManifest();
  if (!m || m.schemaVersion !== 1 || !Array.isArray(m.units)) return [];
  return m.units.filter((u) => u.status === 'published');
}
export async function loadPublishedUnit(unitId) {
  const meta = (await listPublished()).find((u) => u.unitId === unitId); if (!meta) return null;
  const res = await fetch(ROOT + meta.file, { cache: 'no-cache' }); if (!res.ok) throw new Error('讀不到單元檔 ' + meta.file);
  const json = await res.json();
  if (json.unitId !== unitId) throw new Error('單元檔與清單的 unitId 不一致');
  if (!['approved', 'published'].includes(json.reviewStatus)) throw new Error('單元尚未審核');
  return toRuntime(json, meta);
}

const SUPPORTED = ['mc', 'tf', 'fill', 'order'];
const ok = (x) => x && x.reviewStatus === 'approved';

/* 單元 JSON → 執行格式。回傳的 unit 與 science/data/*.js 的結構相容，另有 flow、inlineLessons 等欄位。 */
export function toRuntime(j, meta = {}) {
  const kps = j.keyPoints.filter(ok); const lessons = j.lessons.filter(ok); const exps = j.experiments.filter(ok);
  // 知識標籤：註冊到全域 TAGS（原地新增，不影響既有標籤）
  const remedyOf = (k) => {
    if (k.remedy && k.remedy.type === 'lesson' && lessons.some((l) => l.lessonId === k.remedy.targetId)) return { step: 'lesson', node: k.remedy.targetId };
    if (k.remedy && k.remedy.type === 'experiment') { const e = exps.find((x) => x.experimentId === k.remedy.targetId && x.activityRef); if (e) return { step: 'lab', act: actId(e) }; }
    return { step: 'practice' };
  };
  kps.forEach((k) => { TAGS[k.knowledgePointId] = { name: k.text, unit: j.unitId, remedy: remedyOf(k), status: '已審核' }; });
  const tagIds = new Set(kps.map((k) => k.knowledgePointId));

  const questions = []; let unsupported = 0;
  j.questions.filter(ok).forEach((q) => {
    if (!SUPPORTED.includes(q.questionType) || !tagIds.has(q.knowledgePointId)) { unsupported++; return; }
    const base = { id: q.questionId, level: q.difficulty, tag: q.knowledgePointId, q: q.questionText, explain: q.explanation, source: q.sourceFile + (q.sourcePage ? ' p.' + q.sourcePage : ''), table: q.table || null };
    if (q.questionType === 'mc') questions.push({ ...base, type: 'mc', opts: q.options, answer: q.correctAnswer });
    else if (q.questionType === 'tf') questions.push({ ...base, type: 'mc', opts: ['○ 正確', '✕ 錯誤'], answer: q.correctAnswer ? 0 : 1 });
    else if (q.questionType === 'fill') questions.push({ ...base, type: 'fill', opts: q.options, answerList: q.correctAnswer, anyOrder: !!q.answerAnyOrder, answerText: q.correctAnswer.join('、') });
    else if (q.questionType === 'order') questions.push({ ...base, type: 'order', opts: q.correctAnswer, answerList: q.correctAnswer, answerText: q.correctAnswer.join(' → ') });
  });

  const labs = exps.filter((e) => e.activityRef).map((e) => ({ id: actId(e), title: e.title, node: null, objective: e.objective, steps: e.steps, conditions: e.conditions || [], observe: e.observe || [], principle: e.principle || '', conclusion: e.conclusion || '', safety: e.safety, model: { assumptions: e.modelAssumptions || [], limits: e.modelLimits || [] }, predict: null, minActions: 4 }));
  const flow = [];
  if (labs.length || lessons.length) { if (lessons.length) flow.push('lesson'); if (labs.length) flow.push('lab'); }
  const demo = j.examples.filter(ok).map((x) => ({ title: x.title, kind: x.kind || '範例', problem: x.problem, steps: x.steps, source: (x.source && (x.source.legacyRef || x.source.fileName)) || '', status: '已審核' }));
  if (demo.length) flow.push('demo');
  if (questions.length) flow.push('practice', 'test'); flow.push('result');

  const perLevel = null; const total = Math.min((j.assessments[0] && j.assessments[0].total) || 10, questions.length) || 0;
  const rv = j.version.reviewer ? `審核者：${j.version.reviewer}${j.version.selfReview ? '（自我審查）' : ''}` : '';
  const std = [{ id: 'unit-clear', name: '單元通關', desc: '完成所有學習步驟並看到成果', icon: '🏁', rule: { clear: true } }, { id: 'unit-doctor', name: '單元小博士', desc: '單元測驗答對 90% 以上', icon: '🎓', rule: { test: 90 } }];
  const own = (j.achievements || []).filter((a) => a.rule && a.id).map((a) => ({ icon: '🏅', ...a }));
  return {
    id: j.unitId, grade: j.grade, subject: j.subjectName, unitNo: j.unitNumber, title: j.unitTitle, version: 'v' + j.version.number, status: '已發布',
    reviewNote: `新教材（教材中央資料庫）・已發布版本 v${j.version.number}${rv ? '・' + rv : ''}`, fromContentDb: true,
    source: { page: null, nodes: [], quizUnits: [], note: '來自教材中央資料庫' }, goals: j.learningObjectives || [], scenario: null, labs, demo,
    inlineLessons: lessons.length ? lessons.map((l) => ({ id: l.lessonId, title: l.title, blocks: l.blocks || [], ref: l.ref || null, source: l.source })) : null,
    flow, questions, unsupportedQuestions: unsupported, test: { total, perLevel, passPercent: (j.assessments[0] && j.assessments[0].passPercent) || 60 },
    achievements: [...own, ...std.filter((s) => !own.some((o) => o.id === s.id))], landmark: `「${j.unitTitle}」`,
    next: { text: '可以回到冒險島挑戰其他單元。', links: [['回冒險島', '../home.html'], ['原刷題系統', '../index.html']] },
  };
}
const actId = (e) => String(e.activityRef).split('/').pop().replace(/\.js$/, '');
