/* 學習成就：星星、徽章、單元地標（規則寫在各單元資料的 achievements[].rule，與單元無關）
 * rule 種類：{ lab:'實驗id' }｜{ test:90 }（單元測驗最高正確率 ≥ 90）｜{ clear:true }（本單元所有學習步驟都完成）
 * 各單元的步驟組合由 unit.flow 決定（舊單元為完整六步＋成果）。 */
import { flowOf } from './progress.js';

const coreOf = (unit) => flowOf(unit).filter((s) => s !== 'result');

export function starsOf(rec, unit) {
  const pass = (rec.tests || []).some((t) => t.percent >= unit.test.passPercent);
  const flags = coreOf(unit).map((s) => (s === 'test' ? pass : !!rec.steps[s]));
  return { count: flags.filter(Boolean).length, total: flags.length, flags };
}

export const isUnitComplete = (rec, unit) => coreOf(unit).every((k) => rec.steps[k]);

export function evaluateBadges(rec, unit) {
  const earned = [];
  for (const a of unit.achievements) {
    const r = a.rule || {};
    if (r.lab && rec.labs[r.lab]) earned.push(a.id);
    else if (r.test && (rec.tests || []).some((t) => t.percent >= r.test)) earned.push(a.id);
    else if (r.clear && isUnitComplete(rec, unit)) earned.push(a.id);
  }
  return earned;
}
