/* 管理中心的本機資料（localStorage 的獨立 key：adv-cm-v1）。
 * 只存「草稿與版本」，不碰任何學生端 key（sci6-quest-v1、island-*-v1、adv-sci-v1）。
 * 這是第一階段（靜態網站、本機管理）的做法；第二階段改由後端資料庫取代。 */
import { nowIso } from './adapters.js';

export const KEY = 'adv-cm-v1';
export const STATUSES = { draft: '草稿', parsing: '解析中', pending_review: '待審核', approved: '已審核', published: '已發布', archived: '已封存' };
/* 狀態機：只允許這些轉換 */
export const TRANSITIONS = { draft: ['parsing', 'pending_review'], parsing: ['pending_review', 'draft'], pending_review: ['approved', 'draft'], approved: ['published', 'pending_review'], published: ['archived', 'approved'], archived: ['draft'] };

let db = null;
const blank = () => ({ schemaVersion: 1, settings: { author: '管理者', allowSelfReview: true }, units: {}, files: {}, log: [] });

/* 備份與還原：整份管理中心資料（草稿、版本、紀錄）。還原前會驗證結構；不碰學生端資料。 */
export function exportBackup() { return JSON.stringify({ app: 'adv-content-manager', exportedAt: new Date().toISOString(), data: load() }, null, 1); }
export function importBackup(text, mode = 'replace') {
  let j; try { j = JSON.parse(text); } catch (e) { throw new Error('不是有效的 JSON'); }
  const d = j && j.app === 'adv-content-manager' ? j.data : null; if (!d || d.schemaVersion !== 1 || typeof d.units !== 'object') throw new Error('這不是管理中心的備份檔');
  Object.values(d.units).forEach((u) => { if (!Array.isArray(u.versions) || !u.versions.length) throw new Error('備份檔中的單元缺少版本資料'); });
  load();
  if (mode === 'replace') { db = { ...blank(), ...d, settings: { ...blank().settings, ...(d.settings || {}) } }; }
  else { Object.entries(d.units).forEach(([id, u]) => { if (!db.units[id]) db.units[id] = u; }); Object.assign(db.files, d.files || {}); }
  log('-', 'restore', `還原備份（${mode === 'replace' ? '取代' : '只加入不存在的單元'}，${Object.keys(d.units).length} 個單元）`); save();
  return Object.keys(d.units).length;
}
export function load() { if (db) return db; try { db = JSON.parse(localStorage.getItem(KEY) || 'null') || blank(); } catch (e) { db = blank(); } if (!db.units) db.units = {}; return db; }
export function save() { try { localStorage.setItem(KEY, JSON.stringify(db)); return true; } catch (e) { return false; } }
export const reset = () => { db = blank(); save(); };
export const settings = () => load().settings;
export function log(unitId, action, detail) { load().log.unshift({ t: nowIso(), unitId, action, detail }); db.log.length = Math.min(db.log.length, 300); }

export const listUnits = () => Object.entries(load().units).map(([id, u]) => ({ unitId: id, ...u, current: u.versions.find((v) => v.number === u.currentVersion) }));
export const getUnit = (id) => load().units[id] || null;
export const getVersion = (id, n) => { const u = getUnit(id); return u ? u.versions.find((v) => v.number === (n ?? u.currentVersion)) : null; };

/* 建立全新單元（版本 1） */
export function createUnit(data) {
  load(); if (db.units[data.unitId]) throw new Error('unitId 已存在：' + data.unitId);
  const v = makeVersion(data); db.units[data.unitId] = { currentVersion: v.number, publishedVersion: null, versions: [v] }; log(data.unitId, 'create', `建立 v${v.number}`); save(); return v;
}
function makeVersion(data) { const d = JSON.parse(JSON.stringify(data)); d.reviewStatus = 'draft'; return { number: d.version.number, status: 'draft', data: d, createdAt: nowIso() }; }

/* 更新既有單元：保留舊版，新增一個版本（不覆蓋、不影響學生歷史紀錄） */
export function newVersion(unitId, mutate, summary, author) {
  const u = getUnit(unitId); if (!u) throw new Error('找不到單元'); const base = getVersion(unitId); const d = JSON.parse(JSON.stringify(base.data));
  const n = Math.max(...u.versions.map((v) => v.number)) + 1; const t = nowIso();
  mutate(d); d.version = { number: n, createdAt: t, summary, author, reviewer: null, reviewedAt: null, parentVersion: base.number, publishedAt: null }; d.reviewStatus = 'draft'; d.updatedAt = t;
  const v = { number: n, status: 'draft', data: d, createdAt: t }; u.versions.push(v); u.currentVersion = n; log(unitId, 'new-version', `v${base.number} → v${n}：${summary}`); save(); return v;
}

export function setItemStatus(unitId, items, status) { const v = getVersion(unitId); if (!v || ['approved', 'published', 'archived'].includes(v.status)) throw new Error('這一版已鎖定，請先建立新版本再修改'); items.forEach((it) => { it.reviewStatus = status; }); v.data.updatedAt = nowIso(); save(); }

/* 狀態轉換。進入 approved 需要審核者；進入 published 需要已審核。 */
export function transition(unitId, to, { reviewer, version } = {}) {
  const u = getUnit(unitId), v = getVersion(unitId, version); // version 省略時＝目前版本 if (!v) throw new Error('找不到版本');
  if (!TRANSITIONS[v.status].includes(to)) throw new Error(`不能從「${STATUSES[v.status]}」直接變成「${STATUSES[to]}」`);
  const t = nowIso();
  if (to === 'approved' && v.status !== 'published') {
    if (!reviewer) throw new Error('請填寫審核者');
    const self = reviewer === v.data.version.author;
    if (self && settings().allowSelfReview === false) throw new Error('目前設定不允許自我審查：審核者不可與作者相同');
    v.data.version.reviewer = reviewer; v.data.version.reviewedAt = t; v.data.version.selfReview = self;
  }
  if (to === 'published') { if (!v.data.version.reviewer) throw new Error('沒有審核者，不能發布'); v.data.version.publishedAt = t; u.publishedVersion = v.number; }
  if (v.status === 'published' && to === 'approved') { if (u.publishedVersion === v.number) u.publishedVersion = null; } // 撤回發布
  if (to === 'archived' && u.publishedVersion === v.number) u.publishedVersion = null;
  v.status = to; v.data.reviewStatus = to; v.data.updatedAt = t; log(unitId, 'status', `v${v.number}：${to}`); save(); return v;
}

/* 版本回復：把「目前生效（已發布）的版本」指回舊版，舊版必須曾經審核通過 */
export function rollbackTo(unitId, number, reviewer) {
  const u = getUnit(unitId), v = getVersion(unitId, number); if (!v) throw new Error('找不到版本');
  if (!v.data.version.reviewer) throw new Error('這個版本從未通過審核，不能回復到它');
  u.versions.forEach((x) => { if (x.status === 'published' && x.number !== number) { x.status = 'archived'; x.data.reviewStatus = 'archived'; } });
  v.status = 'published'; v.data.reviewStatus = 'published'; v.data.version.publishedAt = nowIso(); u.publishedVersion = number; u.currentVersion = number; log(unitId, 'rollback', `回復到 v${number}（操作者：${reviewer || settings().author}）`); save(); return v;
}

export function rememberFile(rec, unitId) { load(); const f = db.files[rec.sha256] || (db.files[rec.sha256] = { fileName: rec.fileName, unitIds: [] }); if (!f.unitIds.includes(unitId)) f.unitIds.push(unitId); save(); }
export const knownFile = (sha) => load().files[sha] || null;

/* 發布包：每個版本一個檔（content/units/<unitId>@v<N>.json），manifest 指向生效版本 */
export function buildPublishPackage(existingManifest) {
  const units = []; const files = [];
  listUnits().forEach((u) => { if (u.publishedVersion == null) return; const v = u.versions.find((x) => x.number === u.publishedVersion); const d = v.data;
    units.push({ unitId: d.unitId, grade: d.grade, subject: d.subject, subjectName: d.subjectName, unitNumber: d.unitNumber, unitTitle: d.unitTitle, version: v.number, status: 'published', file: `content/units/${d.unitId}@v${v.number}.json`, publishedAt: d.version.publishedAt });
    u.versions.filter((x) => x.data.version.reviewer && ['published', 'archived', 'approved'].includes(x.status)).forEach((x) => files.push({ name: `content/units/${x.data.unitId}@v${x.number}.json`, text: JSON.stringify(x.data, null, 2) })); });
  const keep = (existingManifest && existingManifest.units ? existingManifest.units : []).filter((m) => !units.some((n) => n.unitId === m.unitId));
  return { manifest: { schemaVersion: 1, generatedAt: nowIso(), units: [...keep, ...units] }, files };
}
