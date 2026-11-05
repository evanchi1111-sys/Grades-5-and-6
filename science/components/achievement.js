/* 學習成就：星星、徽章、單元地標 */
export function starsOf(rec, unit) {
  const pass = (rec.tests || []).some((t) => t.percent >= unit.test.passPercent);
  const flags = [!!rec.steps.scenario, !!rec.steps.lesson, !!rec.steps.lab, !!rec.steps.demo, !!rec.steps.practice, pass];
  return { count: flags.filter(Boolean).length, total: flags.length, flags };
}

export function evaluateBadges(rec, unit) {
  const earned = [];
  if (rec.labs['sun-shadow']) earned.push('shadow-detective');
  if (rec.labs['seasons']) earned.push('season-observer');
  if (rec.labs['solar-panel']) earned.push('solar-engineer');
  if ((rec.tests || []).some((t) => t.percent >= 90)) earned.push('sun-doctor');
  const core = ['scenario', 'lesson', 'lab', 'demo', 'practice', 'test'];
  if (core.every((k) => rec.steps[k])) earned.push('unit-clear');
  return earned;
}
export const isUnitComplete = (rec) => ['scenario', 'lesson', 'lab', 'demo', 'practice', 'test'].every((k) => rec.steps[k]);
