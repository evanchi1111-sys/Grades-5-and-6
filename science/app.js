/* 單元頁主控：七步學習流程 */
import { h, clear } from './components/dom.js';
import { CATALOG, LOADERS } from './data/index.js';
import { TAGS } from './data/tags.js';
import * as R from './store/records.js';
import { STEPS, renderStepper, fmtDuration } from './components/progress.js';
import { mountLesson } from './components/lesson.js';
import { mountLab } from './components/experiment.js';
import { mountDemo } from './components/explanation.js';
import { runQuiz, pickQuestions } from './components/quiz.js';
import { starsOf, evaluateBadges, isUnitComplete } from './components/achievement.js';

const params = new URLSearchParams(location.search);
const id = params.get('id') || 'g5-u1';
const main = document.getElementById('main'), stepper = document.getElementById('stepper'), titleEl = document.getElementById('unit-title'), warn = document.getElementById('warn');
let unit, rec, current = 'scenario', cleanup = null;

function setUrl(step, extra) {
  const q = { id, step }; Object.entries(extra || {}).forEach(([k, v]) => { if (v) q[k] = v; });
  try { history.replaceState(null, '', '?' + new URLSearchParams(q)); } catch (e) {}
}
function go(step, extra) {
  if (cleanup) { cleanup(); cleanup = null; }
  current = step; setUrl(step, extra); renderStepper(stepper, step, rec, (s) => go(s));
  clear(main); window.scrollTo(0, 0);
  const fn = { scenario, lesson, lab, demo, practice, test, result }[step]; (fn || scenario)(extra || {});
  main.focus({ preventScroll: true });
}
const nextBtn = (to, label) => h('div', { class: 'row end' }, h('button', { type: 'button', class: 'btn btn-primary', onclick: () => go(to) }, label || '下一步 →'));
function done(step) { R.markStep(id, step); rec = R.unit(id); renderStepper(stepper, current, rec, (s) => go(s)); }

/* 1 情境任務 */
function scenario() {
  const sc = unit.scenario, p = sc.predict, saved = rec.predictions[p.key];
  const box = h('section', { class: 'panel' }, h('span', { class: 'tag-kind', text: '情境任務' }), h('h2', { text: sc.title }), h('p', { class: 'story', text: sc.story }),
    h('h3', { text: '本單元學習目標' }), h('ul', {}, ...unit.goals.map((g) => h('li', { text: g }))),
    h('div', { class: 'predict' }, h('h4', { text: '先猜猜看' }), h('p', { text: p.q })));
  const opts = h('div', { class: 'row' }), fb = h('div', { 'aria-live': 'polite' });
  p.options.forEach((o, i) => opts.append(h('button', { type: 'button', class: 'chip' + (saved && saved.value === i ? ' on' : ''), disabled: !!saved, onclick: () => {
    R.savePrediction(id, p.key, i, i === p.answer); rec = R.unit(id); done('scenario'); go('scenario');
  } }, o)));
  box.append(opts, fb);
  if (saved) box.append(h('p', { class: 'note', text: `你猜了「${p.options[saved.value]}」。${p.reveal}` }), nextBtn('lesson', '進入知識教室 →'));
  main.append(box);
}

/* 2 知識教室 */
function lesson(extra) {
  const seen = new Set();
  const box = h('section', { class: 'panel' }, h('span', { class: 'tag-kind', text: '知識教室' }), h('h2', { text: '先把重點讀一讀' }), h('p', { class: 'note', text: '下面直接顯示原教材的內容；每個節點都看過，就完成這一步。' }));
  const body = h('div', {}); box.append(body, h('div', { class: 'row end' }, h('button', { type: 'button', class: 'btn btn-primary', onclick: () => go('lab') }, '去做實驗 →')));
  main.append(box);
  mountLesson(body, unit, { node: extra.node, onViewed: (nid, all) => { seen.add(nid); if (all.every((n) => seen.has(n))) done('lesson'); } });
}

/* 3 互動實驗室 */
function lab(extra) {
  const box = h('section', { class: 'panel' }, h('span', { class: 'tag-kind', text: '互動實驗室' }), h('h2', { text: '動手做實驗' }));
  const tabs = h('div', { class: 'seg-row' }), holder = h('div', { class: 'lab-holder' });
  let cur = null;
  async function open(labId) {
    if (cur && cur.destroy) cur.destroy();
    [...tabs.children].forEach((b) => b.classList.toggle('on', b.dataset.id === labId)); setUrl('lab', { act: labId });
    const L = unit.labs.find((x) => x.id === labId);
    try {
      cur = await mountLab(holder, L, { alreadyDone: !!rec.labs[labId],
        onPredict: (lid, v, ok) => R.savePrediction(id, 'lab:' + lid, v, ok),
        onComplete: (lid) => { R.completeLab(id, lid); rec = R.unit(id); if (unit.labs.every((x) => rec.labs[x.id])) done('lab'); else renderStepper(stepper, current, rec, (s) => go(s)); badgeCheck(); markLabTabs(); } });
    } catch (e) { clear(holder); holder.append(h('div', { class: 'sim-warn', text: '這個實驗暫時無法載入：' + e.message })); }
  }
  function markLabTabs() { [...tabs.children].forEach((b) => b.classList.toggle('done', !!rec.labs[b.dataset.id])); }
  unit.labs.forEach((L) => tabs.append(h('button', { type: 'button', class: 'seg', 'data-id': L.id, onclick: () => open(L.id) }, L.title)));
  box.append(tabs, holder, nextBtn('demo', '看老師示範 →')); main.append(box); markLabTabs();
  open(unit.labs.some((x) => x.id === extra.act) ? extra.act : unit.labs[0].id);
  cleanup = () => { cur && cur.destroy && cur.destroy(); };
}

/* 4 老師示範 */
function demo() {
  const box = h('section', { class: 'panel' }, h('span', { class: 'tag-kind', text: '老師示範' }), h('h2', { text: '跟著老師一步一步來' }));
  const body = h('div', {}); box.append(body, nextBtn('practice', '去闖關練習 →')); main.append(box);
  mountDemo(body, unit, { onFinished: () => done('demo') });
}

/* 5 闖關練習 */
function practice(extra) {
  const box = h('section', { class: 'panel' }, h('span', { class: 'tag-kind', text: '闖關練習' }), h('h2', { text: '選一關來挑戰' }), h('p', { class: 'note', text: '每關 6 題，答完立刻看解析。三關都玩過就完成練習。' }));
  const grid = h('div', { class: 'levels' }), arena = h('div', { class: 'arena' });
  [[1, '基礎', '確認基本概念'], [2, '進階', '應用與比較'], [3, '精熟', '情境推理與綜合']].forEach(([lv, n, d]) => {
    const r = rec.practice['L' + lv];
    grid.append(h('button', { type: 'button', class: 'level lv' + lv, onclick: () => start(lv) }, h('b', { text: n }), h('span', { text: d }), h('em', { text: r ? `玩過 ${r.runs} 次・最佳 ${r.best}%` : '還沒挑戰' })));
  });
  box.append(grid, arena, nextBtn('test', '進入單元測驗 →')); main.append(box);
  function start(lv) {
    const qs = pickQuestions(unit.questions, { level: lv, count: 6 });
    arena.scrollIntoView({ behavior: 'smooth', block: 'start' });
    runQuiz(arena, qs, { mode: 'practice', title: ['', '基礎', '進階', '精熟'][lv] + '關', onAnswer: (q, ok) => R.addAttempt(id, { qid: q.id, tag: q.tag, level: q.level, ok, mode: 'practice' }),
      onDone: (res) => {
        const ok = res.filter((x) => x.ok).length; R.addPracticeRun(id, lv, ok, res.length); rec = R.unit(id);
        if ([1, 2, 3].every((k) => rec.practice['L' + k])) done('practice');
        clear(arena);
        arena.append(h('div', { class: 'qcard' }, h('h3', { text: `這一關答對 ${ok} / ${res.length} 題` }), h('p', { text: ok === res.length ? '全部答對，太厲害了！' : '看看答錯的題目，再挑戰一次吧。' }),
          ...res.filter((x) => !x.ok).map((x) => h('p', { class: 'explain' }, h('b', { text: x.q.q }), h('br'), '解析：' + x.q.explain)),
          h('div', { class: 'row' }, h('button', { type: 'button', class: 'btn', onclick: () => start(lv) }, '再玩一次'), h('button', { type: 'button', class: 'btn', onclick: () => go('practice') }, '回到選關'))));
        badgeCheck();
      } });
  }
  if (extra.level) start(+extra.level);
}

/* 6 單元測驗 */
function test() {
  const box = h('section', { class: 'panel' }, h('span', { class: 'tag-kind', text: '單元測驗' }), h('h2', { text: '看看你學會了多少' }));
  const arena = h('div', { class: 'arena' });
  const prev = (rec.tests || []).slice(-1)[0];
  box.append(h('p', { class: 'note', text: `共 ${unit.test.total} 題，作答時不顯示對錯，交卷後才看成績和解析。` + (prev ? `（上次：${prev.score}/${prev.total}，${prev.percent}%）` : '') }), arena); main.append(box);
  const startBtn = h('button', { type: 'button', class: 'btn btn-primary', onclick: begin }, '開始測驗'); arena.append(startBtn);
  function begin() {
    const qs = pickQuestions(unit.questions, { perLevel: unit.test.perLevel });
    runQuiz(arena, qs, { mode: 'test', title: '單元測驗', onAnswer: (q, ok) => R.addAttempt(id, { qid: q.id, tag: q.tag, level: q.level, ok, mode: 'test' }),
      onDone: (res) => finishTest(res) });
  }
  function finishTest(res) {
    const score = res.filter((x) => x.ok).length, total = res.length, percent = Math.round((score / total) * 100);
    const wrong = res.filter((x) => !x.ok);
    R.addTest(id, { score, total, percent, wrongIds: wrong.map((x) => x.q.id), wrongTags: [...new Set(wrong.map((x) => x.q.tag))] });
    rec = R.unit(id); done('test'); badgeCheck();
    clear(arena); arena.append(renderTestResult(res, score, total, percent));
  }
}

function renderTestResult(res, score, total, percent) {
  const wrong = res.filter((x) => !x.ok), tagStat = {};
  res.forEach((x) => { const t = (tagStat[x.q.tag] = tagStat[x.q.tag] || { ok: 0, n: 0 }); t.n++; if (x.ok) t.ok++; });
  const weak = Object.keys(tagStat).filter((t) => tagStat[t].ok < tagStat[t].n);
  const box = h('div', { class: 'qcard result' },
    h('h3', { text: `得分 ${score} / ${total}（正確率 ${percent}%）` }),
    h('p', { class: percent >= unit.test.passPercent ? 'ok' : 'bad', text: percent >= unit.test.passPercent ? '通過！' : '還差一點，看看下面的建議再挑戰。' }),
    h('h4', { text: '各知識點表現' }),
    h('ul', { class: 'taglist' }, ...Object.keys(tagStat).map((t) => h('li', { class: tagStat[t].ok === tagStat[t].n ? 'good' : 'weak' }, `${TAGS[t].name}：${tagStat[t].ok}/${tagStat[t].n}`))));
  if (wrong.length) {
    box.append(h('h4', { text: '答錯的題目與解析' }), ...wrong.map((x) => h('div', { class: 'wrongq' }, h('p', {}, h('b', { text: x.q.q })), h('p', { class: 'bad', text: '你選：' + x.q.opts[x.picked] }), h('p', { class: 'ok', text: '正確：' + x.q.opts[x.q.answer] }), h('p', { class: 'explain', text: '解析：' + x.q.explain }), h('p', { class: 'note', text: '知識點：' + TAGS[x.q.tag].name + '・來源：' + x.q.source }))));
    box.append(h('h4', { text: '建議重新學習' }), ...weak.map((t) => suggestion(t)));
  }
  box.append(h('div', { class: 'row' }, h('button', { type: 'button', class: 'btn', onclick: () => go('test') }, '再測一次'), h('button', { type: 'button', class: 'btn btn-primary', onclick: () => go('result') }, '看學習成果 →')));
  return box;
}

function suggestion(tag) {
  const T = TAGS[tag], hist = R.tagHistory(id, tag, 2), streak = hist.length >= 2 && hist.every((x) => !x.ok);
  const label = T.remedy.step === 'lab' ? '回到互動實驗：' + unit.labs.find((l) => l.id === T.remedy.act).title : '重讀教材：「' + nodeName(T.remedy.node) + '」';
  return h('div', { class: 'suggest' + (streak ? ' streak' : '') }, h('b', { text: T.name }), streak ? h('span', { class: 'tag-kind bad', text: '連續答錯' }) : null,
    h('p', { class: 'note', text: streak ? '這個觀念連續兩次答錯，建議先回去操作，再回來做題。' : '建議再複習一下這個觀念。' }),
    h('button', { type: 'button', class: 'btn', onclick: () => (T.remedy.step === 'lab' ? go('lab', { act: T.remedy.act }) : go('lesson', { node: T.remedy.node })) }, label));
}
const NODE_NAMES = { a1: '太陽與生活', a2: '影子與方位', a3: '四季的太陽', a4: '光與放大鏡' };
const nodeName = (n) => NODE_NAMES[n] || n;

/* 7 學習成果 */
function result() {
  rec = R.unit(id);
  const st = starsOf(rec, unit), earned = evaluateBadges(rec, unit);
  earned.forEach((b) => R.awardBadge(id, b));
  if (isUnitComplete(rec)) R.setCompleted(id);
  rec = R.unit(id); done('result');
  const complete = !!rec.completedAt;
  const box = h('section', { class: 'panel' }, h('span', { class: 'tag-kind', text: '學習成果' }), h('h2', { text: complete ? '🎉 單元通關！' : '目前的學習成果' }));
  box.append(h('div', { class: 'landmark' + (complete ? ' lit' : '') }, h('div', { class: 'sun', text: complete ? '☀️' : '🌑' }), h('p', { text: complete ? '「太陽的祕密」地標已點亮！回到冒險島可以看到。' : '完成前面六個步驟，就能點亮這個單元的地標。' })));
  box.append(h('h3', { text: '學習星星' }), h('div', { class: 'stars', 'aria-label': `星星 ${st.count} / ${st.total}` }, ...st.flags.map((f) => h('span', { class: 'star' + (f ? ' on' : ''), text: f ? '★' : '☆' }))));
  box.append(h('h3', { text: '徽章' }), h('div', { class: 'badges' }, ...unit.achievements.map((a) => h('div', { class: 'badge' + (rec.badges.includes(a.id) ? ' on' : '') }, h('span', { class: 'bi', text: a.icon }), h('b', { text: a.name }), h('span', { class: 'note', text: a.desc })))));
  const best = (rec.tests || []).reduce((m, t) => Math.max(m, t.percent), 0);
  box.append(h('h3', { text: '學習記錄' }), h('ul', {}, h('li', { text: '學習時間：約 ' + fmtDuration(rec.timeSec) }), h('li', { text: '完成的實驗：' + (Object.keys(rec.labs).length ? Object.keys(rec.labs).map((k) => unit.labs.find((l) => l.id === k).title).join('、') : '還沒有') }),
    h('li', { text: '單元測驗：' + ((rec.tests || []).length ? `${rec.tests.length} 次，最高 ${best}%` : '還沒有') }), h('li', { text: '開始：' + (rec.startedAt ? new Date(rec.startedAt).toLocaleString('zh-TW') : '—') + (rec.completedAt ? '；完成：' + new Date(rec.completedAt).toLocaleString('zh-TW') : '') })));
  // 下一步建議
  const missing = STEPS.slice(0, 6).find((s) => !rec.steps[s.id]);
  const nxt = h('div', { class: 'suggest' }, h('b', { text: '下一個學習建議' }));
  const recentWrong = (rec.tests || []).slice(-1)[0];
  if (missing) nxt.append(h('p', { text: '還沒完成「' + missing.name + '」，先把它做完吧。' }), h('button', { type: 'button', class: 'btn btn-primary', onclick: () => go(missing.id) }, '前往' + missing.name));
  else if (recentWrong && recentWrong.wrongTags.length) { nxt.append(h('p', { text: '最近一次測驗還有不熟的觀念，先複習它們：' })); recentWrong.wrongTags.forEach((t) => nxt.append(suggestion(t))); }
  else nxt.append(h('p', { text: '這個單元學得很好！可以繼續第 2 單元「千變萬化的植物」。互動版還在準備中，現在可以先用原本的教材和刷題：' }), h('div', { class: 'row' }, h('a', { class: 'btn btn-primary', href: '../island.html', text: '原教材：植物單元' }), h('a', { class: 'btn', href: '../index.html?u=21', text: '原刷題：植物單元' })));
  box.append(nxt, h('p', { class: 'note', text: '學習紀錄只保存在這台裝置的這個瀏覽器，不會上傳，也不會跨裝置同步。' }));
  main.append(box);
}

function badgeCheck() { const e = evaluateBadges(rec, unit); e.forEach((b) => R.awardBadge(id, b)); rec = R.unit(id); }

/* 啟動 */
(async function boot() {
  const meta = CATALOG.find((c) => c.id === id);
  if (!meta || !LOADERS[id]) { main.append(h('div', { class: 'panel' }, h('h2', { text: '這個單元還在準備中' }), h('p', { text: meta ? `「${meta.title}」的互動教材還沒有完成。你可以先使用原本的教材和刷題：` : '找不到這個單元。' }), meta ? h('div', { class: 'row' }, h('a', { class: 'btn btn-primary', href: '../' + meta.original.page, text: '原教材' }), h('a', { class: 'btn', href: '../' + meta.original.quiz, text: '原刷題' })) : null, h('a', { class: 'btn', href: 'index.html', text: '回互動教材首頁' }))); return; }
  try { unit = (await LOADERS[id]()).default; } catch (e) { main.append(h('div', { class: 'panel sim-warn', text: '單元資料載入失敗：' + e.message })); return; }
  titleEl.textContent = `五年級自然・第 ${unit.unitNo} 單元 ${unit.title}`;
  if (!R.nickname()) R.setNickname('小勇者');
  R.touchStart(id); rec = R.unit(id);
  if (!R.isPersistent()) warn.hidden = false;
  setInterval(() => { if (document.visibilityState === 'visible') { R.addTime(id, 15); } }, 15000);
  const step = STEPS.some((s) => s.id === params.get('step')) ? params.get('step') : 'scenario';
  go(step, { act: params.get('act'), node: params.get('node') });
})();
