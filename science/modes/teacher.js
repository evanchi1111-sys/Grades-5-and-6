/* 老師模式：大螢幕投影教學（教材、互動實驗、示範、題目講解、課堂小考、匯出）
 * 資料只在這台裝置；沒有班級、多位學生或跨裝置功能。 */
import { h, clear, richText } from '../components/dom.js';
import { answerText, qType } from '../components/quiz.js';
import { requireRole, leave } from './gate.js';
import { loadUnits, analyze, reportText, download, unitName } from './report.js';
import { buildIndex } from '../tutor/knowledge.js';
import { pickQuestions } from '../components/quiz.js';
import { TAGS } from '../data/tags.js';
import * as R from '../store/records.js';

const main = document.getElementById('main');
const optsOf = (q) => (qType(q) === 'mc' ? q.opts : qType(q) === 'fill' ? ['可用詞語：' + q.opts.join('、')] : ['（請依正確順序排列）' + q.opts.join('；')]);
requireRole('teacher', '老師模式', main, start);

async function start() {
  clear(main); main.append(h('p', { class: 'note', text: '載入中…' }));
  const units = await loadUnits(); const ids = Object.keys(units); clear(main);
  let U = units[new URLSearchParams(location.search).get('id')] || units[ids[0]], index = null, slides = [], pos = 0, filter = 'all', cur = null;
  const sel = h('select', { 'aria-label': '選擇單元', onchange: (e) => { U = units[e.target.value]; build(); } }, ...ids.map((i) => h('option', { value: i, selected: i === U.id, text: unitName(units[i]) })));
  const fsel = h('select', { 'aria-label': '題目範圍', onchange: (e) => { filter = e.target.value; build(); } }, ...[['all', '題目：全部'], ['1', '只看基礎'], ['2', '只看進階'], ['3', '只看精熟'], ['quiz', '課堂小考（12 題）']].map(([v, n]) => h('option', { value: v, text: n })));
  const stage = h('div', { class: 'stage-wrap', tabindex: '-1' }); const bar = h('div', { class: 'tbar no-print' });
  const prev = h('button', { type: 'button', class: 'btn', onclick: () => go(pos - 1) }, '◀ 上一頁'), next = h('button', { type: 'button', class: 'btn btn-primary', onclick: () => go(pos + 1) }, '下一頁 ▶');
  const jump = h('select', { 'aria-label': '跳到', onchange: (e) => go(+e.target.value) });
  const info = h('span', { class: 'note' });
  const toggleFs = () => { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen && document.documentElement.requestFullscreen(); };
  let scale = 1; const setScale = (d) => { scale = Math.max(0.8, Math.min(1.8, scale + d)); stage.style.setProperty('--scale', scale); };
  bar.append(prev, next, jump, info, h('button', { type: 'button', class: 'btn', onclick: () => setScale(-0.1), 'aria-label': '縮小字體' }, 'A−'), h('button', { type: 'button', class: 'btn', onclick: () => setScale(0.1), 'aria-label': '放大字體' }, 'A＋'),
    h('button', { type: 'button', class: 'btn', id: 'fs-btn', onclick: toggleFs }, '⛶ 全螢幕'),
    h('button', { type: 'button', class: 'btn', onclick: randomQ }, '🎲 抽一題'));
  const tools = h('section', { class: 'panel no-print' }, h('h2', { text: '老師模式' }),
    h('p', { class: 'note', text: '用來在課堂上投影教材、操作互動實驗、講解題目。資料只在這台裝置，沒有班級或多位學生的管理。快速鍵：← → 換頁、F 全螢幕。' }),
    h('div', { class: 'row' }, h('label', {}, '單元：', sel), h('label', {}, fsel),
      h('button', { type: 'button', class: 'btn', onclick: () => window.print() }, '🖨 列印題目與解答'),
      h('button', { type: 'button', class: 'btn', onclick: exportResults }, '⬇ 匯出這台裝置的學習成果'),
      h('a', { class: 'btn', href: 'index.html', text: '回學生畫面' }), h('button', { type: 'button', class: 'btn', onclick: () => { leave('teacher'); location.href = 'index.html'; } }, '離開老師模式')));
  const sheet = h('section', { class: 'print-sheet' });
  main.append(tools, bar, stage, sheet);

  const slide = (title, ...kids) => ({ title, render: (box) => box.append(h('h2', { class: 'sl-title', text: title }), ...kids.map((k) => (typeof k === 'function' ? k() : k))) });
  const reveal = (label, node) => () => { const b = h('div', { class: 'reveal' }, node); b.hidden = true; const btn = h('button', { type: 'button', class: 'btn', onclick: () => { b.hidden = !b.hidden; btn.textContent = (b.hidden ? '顯示' : '隱藏') + label; } }, '顯示' + label); return h('div', {}, btn, b); };

  async function build() {
    if (cur && cur.destroy) { cur.destroy(); cur = null; }
    clear(stage); stage.append(h('p', { class: 'note', text: '載入中…' })); index = await buildIndex(U);
    slides = [];
    slides.push(slide(unitName(U), h('p', { class: 'sl-sub', text: U.reviewNote || '內容狀態：待審核（新增內容尚未經人工確認）' }), h('h3', { text: '學習目標' }), h('ul', { class: 'sl-list' }, ...U.goals.map((g) => h('li', { text: g })))));
    if (U.scenario) slides.push(slide('情境任務：' + U.scenario.title, h('p', { class: 'sl-text', text: U.scenario.story }), h('h3', { text: '先猜猜看' }), h('p', { class: 'sl-text', text: U.scenario.predict.q }), h('ol', { class: 'sl-list', type: 'A' }, ...U.scenario.predict.options.map((o) => h('li', { text: o }))), reveal('答案與說明', h('p', { class: 'ok', text: '答案：' + U.scenario.predict.options[U.scenario.predict.answer] + '。' + U.scenario.predict.reveal }))));
    index.entries.filter((e) => e.kind === 'lesson').forEach((e) => slides.push(slide(`${e.nodeName}：${e.title}`, h('ul', { class: 'sl-list' }, ...e.lines.map((l) => h('li', {}, l))), h('p', { class: 'note', text: '來源：' + e.source }))));
    index.entries.filter((e) => e.kind === 'trap').forEach((e) => slides.push(slide(`易錯提醒：${e.nodeName}`, h('p', { class: 'sl-text trap', text: e.lines[0] }))));
    U.labs.forEach((l) => slides.push({ title: '實驗：' + l.title, render: async (box) => {
      box.append(h('h2', { class: 'sl-title', text: '互動實驗：' + l.title }), h('p', { class: 'sl-text' }, h('b', { text: '目的：' }), l.objective), h('ol', { class: 'sl-list' }, ...l.steps.map((x) => h('li', { text: x }))));
      const holder = h('div', { class: 'lab-big' }); box.append(holder, h('h3', { text: '觀察重點' }), h('ul', { class: 'sl-list' }, ...l.observe.map((x) => h('li', { text: x }))), reveal('原理與結論', h('div', {}, h('p', {}, h('b', { text: '原理：' }), l.principle), h('p', {}, h('b', { text: '結論：' }), l.conclusion)))(), h('p', { class: 'sim-warn', text: '模型限制：' + l.model.limits.join('；') }), h('p', { class: 'sim-warn', text: '安全提醒：' + l.safety }));
      try { const m = await import(`../activities/${l.id}.js`); cur = m.mount(holder, {}); } catch (e) { holder.append(h('p', { class: 'bad', text: '互動載入失敗：' + e.message })); } } }));
    U.demo.forEach((d, i) => slides.push(slide(`老師示範 ${i + 1}：${d.title}`, h('p', { class: 'sl-text' }, h('b', { text: '題目：' }), d.problem), h('ol', { class: 'sl-list' }, ...d.steps.map((x) => h('li', { text: x }))), h('p', { class: 'note', text: '來源：' + d.source }))));
    let qs = U.questions.slice();
    if (filter === 'quiz') qs = pickQuestions(U.questions, U.test.perLevel ? { perLevel: U.test.perLevel } : { total: U.test.total }); else if (filter !== 'all') qs = qs.filter((q) => q.level === +filter);
    const qslide = (q, i, n) => slide(`第 ${i + 1}／${n} 題（${['', '基礎', '進階', '精熟'][q.level]}）`, h('p', { class: 'sl-q', text: q.q }), h('ol', { class: 'sl-list opts-big', type: 'A' }, ...optsOf(q).map((o) => h('li', { text: o }))));
    const ans = (q, i) => reveal('答案與解析', h('div', {}, h('p', { class: 'ok', text: '答案：' + answerText(q) }), h('p', { class: 'explain', text: '解析：' + q.explain }), h('p', { class: 'note', text: `知識點：${TAGS[q.tag].name}・來源：${q.source}` })));
    if (filter === 'quiz') { qs.forEach((q, i) => { const s = qslide(q, i, qs.length); slides.push(s); }); slides.push(slide('解答與講解（共 ' + qs.length + ' 題）', ...[] )); qs.forEach((q, i) => slides.push(slide(`解答 ${i + 1}：${q.q.slice(0, 22)}${q.q.length > 22 ? '…' : ''}`, h('p', { class: 'sl-q', text: q.q }), h('p', { class: 'ok', text: '答案：' + answerText(q) }), h('p', { class: 'explain', text: '解析：' + q.explain }), h('p', { class: 'note', text: `知識點：${TAGS[q.tag].name}` })))); }
    else qs.forEach((q, i) => { const s = qslide(q, i, qs.length); const r = s.render; s.render = (box) => { r(box); box.append(ans(q, i)()); }; slides.push(s); });
    slides.push(slide('本單元小結', h('ul', { class: 'sl-list' }, ...U.labs.map((l) => h('li', {}, h('b', { text: l.title + '：' }), l.conclusion))), h('p', { class: 'note', text: '所有新增內容皆為「待審核」，請以課本與原教材為準。' })));
    jump.textContent = ''; slides.forEach((s, i) => jump.append(h('option', { value: i, text: `${i + 1}. ${s.title.slice(0, 26)}` })));
    drawSheet(qs); go(0);
  }
  async function go(i) {
    pos = Math.max(0, Math.min(slides.length - 1, i));
    if (cur && cur.destroy) { cur.destroy(); cur = null; }
    clear(stage); const box = h('article', { class: 'slide' }); stage.append(box); await slides[pos].render(box);
    prev.disabled = pos === 0; next.disabled = pos === slides.length - 1; jump.value = String(pos); info.textContent = `${pos + 1} / ${slides.length}`;
  }
  function randomQ() { const idx = slides.map((s, i) => (/^第 \d+／/.test(s.title) ? i : -1)).filter((i) => i >= 0); if (idx.length) go(idx[Math.floor(Math.random() * idx.length)]); }
  document.addEventListener('keydown', (e) => { if (/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) return; if (e.key === 'ArrowRight') go(pos + 1); else if (e.key === 'ArrowLeft') go(pos - 1); else if (e.key === 'f' || e.key === 'F') toggleFs(); });

  function drawSheet(qs) { // 列印用：題目與解答
    clear(sheet); sheet.append(h('h1', { text: unitName(U) + '　題目與解答' }), h('p', { class: 'note', text: '內容狀態：待審核。' }),
      ...qs.map((q, i) => h('div', { class: 'pq' }, h('p', {}, h('b', { text: `${i + 1}. （${['', '基礎', '進階', '精熟'][q.level]}）${q.q}` })), h('ol', { type: 'A' }, ...optsOf(q).map((o) => h('li', { text: o }))), h('p', { class: 'ok', text: '答案：' + answerText(q) }), h('p', { text: '解析：' + q.explain }), h('p', { class: 'note', text: `知識點：${TAGS[q.tag].name}・來源：${q.source}` }))));
  }
  function exportResults() { const name = R.nickname() || '小勇者'; const an = Object.values(units).map((u) => analyze(u, R.peekUnit(name, u.id))); download(`學習成果-${name}.txt`, reportText(name, an)); }
  build();
}
