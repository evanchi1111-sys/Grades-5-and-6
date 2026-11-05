/* 精簡版 JSON Schema 驗證器（draft-07 的常用子集）：type、enum、const、pattern、min/max、items、properties、required、additionalProperties、$ref。
 * 另有 semanticChecks()：Schema 表達不了的規則（答案索引範圍、題目對應知識點、審核狀態一致性等）。 */
const typeOf = (v) => (v === null ? 'null' : Array.isArray(v) ? 'array' : Number.isInteger(v) ? 'integer' : typeof v);

export function validate(schema, data, root = schema, path = '$', errs = []) {
  if (schema.$ref) { const t = schema.$ref.replace(/^#\//, '').split('/').reduce((o, k) => o && o[k], root); if (!t) { errs.push({ path, msg: '找不到 ' + schema.$ref }); return errs; } return validate(t, data, root, path, errs); }
  if ('const' in schema && data !== schema.const) errs.push({ path, msg: `必須是 ${JSON.stringify(schema.const)}` });
  if (schema.enum && !schema.enum.includes(data)) errs.push({ path, msg: `必須是 ${schema.enum.join(' / ')} 其中之一（目前：${JSON.stringify(data)}）` });
  if (schema.type) {
    const types = [].concat(schema.type), t = typeOf(data);
    if (!types.includes(t) && !(t === 'integer' && types.includes('number'))) { errs.push({ path, msg: `型別應為 ${types.join('/')}，實際是 ${t}` }); return errs; }
  }
  if (typeof data === 'string') {
    if (schema.minLength != null && data.length < schema.minLength) errs.push({ path, msg: `不可為空（至少 ${schema.minLength} 字）` });
    if (schema.pattern && !new RegExp(schema.pattern).test(data)) errs.push({ path, msg: `格式不符：${schema.pattern}` });
  }
  if (typeof data === 'number') { if (schema.minimum != null && data < schema.minimum) errs.push({ path, msg: `不可小於 ${schema.minimum}` }); if (schema.maximum != null && data > schema.maximum) errs.push({ path, msg: `不可大於 ${schema.maximum}` }); }
  if (Array.isArray(data)) {
    if (schema.minItems != null && data.length < schema.minItems) errs.push({ path, msg: `至少 ${schema.minItems} 項` });
    if (schema.maxItems != null && data.length > schema.maxItems) errs.push({ path, msg: `最多 ${schema.maxItems} 項` });
    if (schema.items) data.forEach((x, i) => validate(schema.items, x, root, `${path}[${i}]`, errs));
  }
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    (schema.required || []).forEach((k) => { if (!(k in data)) errs.push({ path: `${path}.${k}`, msg: '缺少必要欄位' }); });
    const props = schema.properties || {};
    Object.keys(data).forEach((k) => { if (props[k]) validate(props[k], data[k], root, `${path}.${k}`, errs); else if (schema.additionalProperties === false) errs.push({ path: `${path}.${k}`, msg: '不允許的欄位' }); });
  }
  return errs;
}

/* 語意檢查：回傳 [{path,msg,level}]，level 為 error（不可通過）或 warn（提醒） */
export function semanticChecks(u) {
  const out = []; const add = (path, msg, level = 'error') => out.push({ path, msg, level });
  const ids = (arr, key) => { const seen = new Set(); (arr || []).forEach((x, i) => { if (seen.has(x[key])) add(`$.${key}[${i}]`, `${key} 重複：${x[key]}`); seen.add(x[key]); }); return seen; };
  const lessonIds = ids(u.lessons, 'lessonId'), kpIds = ids(u.keyPoints, 'knowledgePointId'), qIds = ids(u.questions, 'questionId');
  ids(u.experiments, 'experimentId'); ids(u.illustrations, 'illustrationId'); ids(u.examples, 'exampleId');
  const fileIds = new Set((u.sourceFiles || []).map((f) => f.fileId));
  if (u.unitId) { const m = /^G(\d+)-([A-Z]+)-U(\d+)$/.exec(u.unitId); if (m && (+m[1] !== u.grade || m[2] !== u.subject || +m[3] !== u.unitNumber)) add('$.unitId', 'unitId 與 grade／subject／unitNumber 不一致'); }
  (u.keyPoints || []).forEach((k, i) => { if (k.lessonId && !lessonIds.has(k.lessonId)) add(`$.keyPoints[${i}].lessonId`, '找不到對應的 lesson'); });
  (u.lessons || []).forEach((l, i) => (l.keyPointIds || []).forEach((k) => { if (!kpIds.has(k)) add(`$.lessons[${i}].keyPointIds`, `找不到知識點 ${k}`); }));
  (u.questions || []).forEach((q, i) => {
    const p = `$.questions[${i}]`;
    if (q.unitId !== u.unitId) add(`${p}.unitId`, '題目的 unitId 與單元不同');
    if (!kpIds.has(q.knowledgePointId)) add(`${p}.knowledgePointId`, `題目沒有對應到存在的知識點（${q.knowledgePointId}）`);
    const a = q.correctAnswer, o = q.options || [];
    if (q.questionType === 'mc') { if (!Number.isInteger(a) || a < 0 || a >= o.length) add(`${p}.correctAnswer`, '選擇題答案必須是選項索引'); if (new Set(o.map(String)).size !== o.length) add(`${p}.options`, '選項有重複'); if (o.length < 2) add(`${p}.options`, '選擇題至少 2 個選項'); }
    if (q.questionType === 'tf' && typeof a !== 'boolean') add(`${p}.correctAnswer`, '是非題答案必須是 true / false');
    if (q.questionType === 'fill' && !(Array.isArray(a) && a.length && a.every((x) => typeof x === 'string'))) add(`${p}.correctAnswer`, '填充題答案必須是字串陣列');
    if (q.questionType === 'match' && !(Array.isArray(a) && a.length >= 2 && a.every((x) => Array.isArray(x) && x.length === 2))) add(`${p}.correctAnswer`, '配合題答案必須是 [左,右] 配對陣列');
    if (q.questionType === 'order' && !(Array.isArray(a) && a.length >= 2 && a.every((x) => typeof x === 'string') && new Set(a).size === a.length)) add(`${p}.correctAnswer`, '排序題答案必須是不重複的字串陣列（正確順序）');
    if (q.questionType === 'sort') { const b = q.options && q.options.buckets, it = q.options && q.options.items; if (!(Array.isArray(b) && b.length >= 2 && Array.isArray(it) && it.length >= 2)) add(`${p}.options`, '分類題需要 options.buckets 與 options.items'); else if (!(Array.isArray(a) && a.length === it.length && a.every((x) => Number.isInteger(x) && x >= 0 && x < b.length))) add(`${p}.correctAnswer`, '分類題答案必須是每個項目所屬分類的索引'); }
    if (q.questionType === 'short' && !(a && typeof a === 'object' && typeof a.reference === 'string')) add(`${p}.correctAnswer`, '簡答題答案需包含 reference（參考答案）');
    if (q.sourceFile && ![...fileIds].some((f) => f === q.sourceFile) && !(u.sourceFiles || []).some((f) => f.fileName === q.sourceFile)) add(`${p}.sourceFile`, '來源檔不在 sourceFiles 內', 'warn');
    if (q.sourcePage == null && q.reviewStatus === 'approved') add(`${p}.sourcePage`, '已審核的題目沒有來源頁碼', 'warn');
  });
  (u.assessments || []).forEach((a, i) => a.questionIds.forEach((id) => { if (!qIds.has(id)) add(`$.assessments[${i}].questionIds`, `找不到題目 ${id}`); }));
  (u.experiments || []).forEach((e, i) => { if (!e.safety) add(`$.experiments[${i}].safety`, '實驗必須有安全提醒'); });
  const need = collectItems(u).filter((x) => x.reviewStatus === 'needs_confirmation').length; if (need) add('$', `有 ${need} 項標示「待人工確認」，審核通過前必須處理`, 'warn');
  if (['approved', 'published'].includes(u.reviewStatus)) {
    const bad = collectItems(u).filter((x) => x.reviewStatus !== 'approved'); if (bad.length) add('$.reviewStatus', `狀態為 ${u.reviewStatus}，但還有 ${bad.length} 項內容未通過審核`);
    if (!u.version.reviewer) add('$.version.reviewer', '已審核／已發布必須有審核者');
  }
  return out;
}
export function collectItems(u) { return [...u.lessons, ...u.keyPoints, ...u.illustrations, ...u.experiments, ...u.examples, ...u.questions, ...u.explanations, ...u.commonMistakes]; }
