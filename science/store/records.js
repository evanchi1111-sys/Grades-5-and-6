/* 學習紀錄：只讀寫自己的 key「adv-sci-v1」，不碰原系統任何 localStorage key。
 * 結構有 schemaVersion，日後升級由 migrate() 處理。
 * 若瀏覽器禁止儲存（隱私模式等），會退回記憶體模式並提示（紀錄不會保留）。 */
export const KEY = 'adv-sci-v1';
export const VERSION = 1;
const MAX_ATTEMPTS = 600;

let db = null;
let persistent = true;

function blank() { return { schemaVersion: VERSION, current: null, profiles: {} }; }

function migrate(o) {
  if (!o || typeof o !== 'object' || Array.isArray(o)) return blank();
  if (!o.schemaVersion) o.schemaVersion = 1;
  // 未來版本升級：if (o.schemaVersion < 2) { ...; o.schemaVersion = 2 }
  if (!o.profiles || typeof o.profiles !== 'object') o.profiles = {};
  return o;
}

export function load() {
  if (db) return db;
  try {
    const raw = localStorage.getItem(KEY);
    db = raw ? migrate(JSON.parse(raw)) : blank();
  } catch (e) { db = blank(); persistent = false; }
  return db;
}
export function isPersistent() { return persistent; }

function commit() {
  try { localStorage.setItem(KEY, JSON.stringify(db)); persistent = true; }
  catch (e) { persistent = false; }
}

export function nickname() { return load().current; }
export function setNickname(name) {
  const n = String(name || '').trim().slice(0, 12) || '小勇者';
  load(); db.current = n;
  if (!db.profiles[n]) db.profiles[n] = { createdAt: Date.now(), units: {} };
  commit(); return n;
}
function profile() {
  load();
  if (!db.current) setNickname('小勇者');
  return db.profiles[db.current];
}

export function unit(id) {
  const p = profile();
  if (!p.units[id]) p.units[id] = { startedAt: null, completedAt: null, timeSec: 0, steps: {}, labs: {}, predictions: {}, attempts: [], tests: [], badges: [], practice: {} };
  return p.units[id];
}

export function touchStart(id) { const u = unit(id); if (!u.startedAt) { u.startedAt = Date.now(); commit(); } }
export function markStep(id, step) { const u = unit(id); if (!u.steps[step]) { u.steps[step] = Date.now(); commit(); } }
export function addTime(id, sec) { const u = unit(id); u.timeSec += sec; commit(); }
export function savePrediction(id, key, value, ok) { const u = unit(id); u.predictions[key] = { value, ok, t: Date.now() }; commit(); }
export function completeLab(id, act) { const u = unit(id); u.labs[act] = (u.labs[act] || 0) + 1; commit(); }

export function addAttempt(id, a) {
  const u = unit(id); u.attempts.push({ t: Date.now(), qid: a.qid, tag: a.tag, level: a.level, ok: !!a.ok, mode: a.mode });
  if (u.attempts.length > MAX_ATTEMPTS) u.attempts.splice(0, u.attempts.length - MAX_ATTEMPTS);
  if (a.mode === 'practice') { const k = 'L' + a.level; const r = u.practice[k] || (u.practice[k] = { runs: 0, best: 0 }); void r; }
  commit();
}
export function addPracticeRun(id, level, correct, total) {
  const u = unit(id); const k = 'L' + level; const r = u.practice[k] || (u.practice[k] = { runs: 0, best: 0 });
  r.runs++; r.best = Math.max(r.best, Math.round((correct / total) * 100)); commit();
}
export function addTest(id, t) { const u = unit(id); u.tests.push({ t: Date.now(), ...t }); commit(); }
export function awardBadge(id, badge) { const u = unit(id); if (!u.badges.includes(badge)) { u.badges.push(badge); commit(); return true; } return false; }
export function setCompleted(id) { const u = unit(id); if (!u.completedAt) { u.completedAt = Date.now(); commit(); } }

/* 各標籤最近的作答（新到舊），用來判斷「連續答錯」 */
export function tagHistory(id, tag, n = 3) {
  const u = unit(id); const out = [];
  for (let i = u.attempts.length - 1; i >= 0 && out.length < n; i--) if (u.attempts[i].tag === tag) out.push(u.attempts[i]);
  return out;
}

/* 純讀取摘要（給 3D 冒險島與入口頁顯示星星）。不會建立任何資料。 */
export function peekSummary(id) {
  try {
    const o = JSON.parse(localStorage.getItem(KEY) || 'null'); if (!o || !o.current) return null;
    const u = o.profiles[o.current] && o.profiles[o.current].units[id]; if (!u) return null;
    return { completed: !!u.completedAt, badges: u.badges || [], steps: Object.keys(u.steps || {}).length };
  } catch (e) { return null; }
}

/* ---- Phase E 新增（只增加欄位與讀取函式，不改變既有資料格式；schemaVersion 仍為 1） ---- */
export function profileNames() { load(); return Object.keys(db.profiles); }
export function selectProfile(name) { load(); if (db.profiles[name]) { db.current = name; commit(); return true; } return false; }
/* 取得某個暱稱的單元紀錄（唯讀，不會建立資料） */
export function peekUnit(name, id) { load(); const p = db.profiles[name]; return p && p.units[id] ? p.units[id] : null; }
/* 小幫手使用次數（kind：hint／explain／similar／search／reveal） */
export function addTutor(id, kind) { const u = unit(id); if (!u.tutor) u.tutor = { total: 0, byKind: {} }; u.tutor.total++; u.tutor.byKind[kind] = (u.tutor.byKind[kind] || 0) + 1; commit(); }
/* 匯出整份紀錄（家長／老師匯出用；只讀） */
export function exportAll() { load(); return JSON.parse(JSON.stringify(db)); }
