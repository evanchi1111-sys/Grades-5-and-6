/* 學習成就：星星、徽章、單元地標（規則寫在各單元資料的 achievements[].rule，與單元無關）
 * rule 種類：{ lab:'實驗id' }｜{ test:90 }（單元測驗最高正確率 ≥ 90）｜{ clear:true }（六個核心步驟都完成） */
const CORE = ['scenario', 'lesson', 'lab', 'demo', 'practice', 'test'];

export function starsOf(rec, unit) {
  const pass = (rec.tests || []).some((t) => t.percent >= unit.test.passPercent);
  const flags = [!!rec.steps.scenario, !!rec.steps.lesson, !!rec.steps.lab, !!rec.steps.demo, !!rec.steps.practice, pass];
  return { count: flags.filter(Boolean).length, total: flags.length, flags };
}

export const isUnitComplete = (rec) => CORE.every((k) => rec.steps[k]);

export function evaluateBadges(rec, unit) {
  const earned = [];
  for (const a of unit.achievements) {
    const r = a.rule || {};
    if (r.lab && rec.labs[r.lab]) earned.push(a.id);
    else if (r.test && (rec.tests || []).some((t) => t.percent >= r.test)) earned.push(a.id);
    else if (r.clear && isUnitComplete(rec)) earned.push(a.id);
  }
  return earned;
}
