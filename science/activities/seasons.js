/* 四季太陽模擬器：面向南方看天空（左東右西），畫出四個節氣的太陽路徑 */
import { h, s, reducedMotion } from '../components/dom.js';
import { TERMS, DECL, sunPos, dayInfo, azName, fmtTime } from './astro.js';

export function mount(root, opts = {}) {
  const st = { term: 'summer', hour: 12, compare: false, playing: false };
  let actions = 0, raf = 0, last = 0;
  const bump = () => { actions++; opts.onAction && opts.onAction(actions); };

  const W = 420, Hh = 250, X0 = 30, X1 = 390, GY = 215, TOPY = 25;
  const xOf = (az) => X0 + ((az - 55) / (305 - 55)) * (X1 - X0);
  const yOf = (alt) => GY - (alt / 90) * (GY - TOPY);
  const svg = s('svg', { viewBox: `0 0 ${W} ${Hh}`, role: 'img', 'aria-label': '太陽路徑圖：面向南方，左邊是東，右邊是西', class: 'sim-svg wide' });
  svg.append(s('rect', { x: 0, y: 0, width: W, height: Hh, fill: '#dff1fb' }), s('rect', { x: 0, y: GY, width: W, height: Hh - GY, fill: '#b9e3a4' }), s('line', { x1: 0, y1: GY, x2: W, y2: GY, stroke: '#3d2f3a', 'stroke-width': 3 }));
  [[60, '東偏北'], [90, '東'], [135, '東南'], [180, '南'], [225, '西南'], [270, '西'], [300, '西偏北']].forEach(([a, n]) => {
    if (n.includes('偏')) return;
    svg.append(s('line', { x1: xOf(a), y1: GY, x2: xOf(a), y2: GY + 6, stroke: '#3d2f3a', 'stroke-width': 2 }), s('text', { x: xOf(a), y: GY + 22, 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 700, fill: '#4a3b45', text: n }));
  });
  [30, 60, 90].forEach((a) => { svg.append(s('line', { x1: X0, y1: yOf(a), x2: X1, y2: yOf(a), stroke: '#c9dde8', 'stroke-width': 1, 'stroke-dasharray': '3 4' }), s('text', { x: 4, y: yOf(a) - 3, 'font-size': 11, fill: '#7d6d78', text: a + '°' })); });
  const paths = {}, pts = {};
  TERMS.forEach((t) => {
    const p = s('polyline', { fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }); paths[t.id] = p; svg.append(p);
    const arr = []; for (let hr = 4; hr <= 20; hr += 0.1) { const q = sunPos(DECL[t.id], hr); if (q.alt > 0) arr.push([xOf(q.az), yOf(q.alt)]); } pts[t.id] = arr;
    p.setAttribute('points', arr.map((q) => q[0].toFixed(1) + ',' + q[1].toFixed(1)).join(' '));
  });
  const sunDot = s('g', {}, s('circle', { r: 13, fill: '#ffd166', stroke: '#e0a23a', 'stroke-width': 3 }));
  const noonMark = s('line', { stroke: '#3d2f3a', 'stroke-width': 1.5, 'stroke-dasharray': '4 3' });
  svg.append(noonMark, sunDot);

  const termBtns = TERMS.map((t) => h('button', { type: 'button', class: 'seg', style: '--c:' + t.color, onclick: () => { st.term = t.id; sync(); bump(); } }, t.name));
  const hourIn = h('input', { type: 'range', min: 4, max: 20, step: 0.05, value: st.hour, 'aria-label': '一天中的時間' });
  const cmp = h('input', { type: 'checkbox', id: 'cmp-' + Math.random().toString(36).slice(2, 6) });
  const playBtn = h('button', { type: 'button', class: 'btn' }, '▶ 播放');
  const out = h('div', { class: 'readout', 'aria-live': 'polite' });
  const tbl = h('table', { class: 'tbl' });

  function drawTable() {
    tbl.textContent = '';
    tbl.append(h('tr', {}, ...['節氣', '日出（時刻・方位）', '日落（時刻・方位）', '中午太陽高度角'].map((x) => h('th', { text: x }))));
    TERMS.forEach((t) => {
      const d = dayInfo(DECL[t.id]);
      const tr = h('tr', { class: t.id === st.term ? 'hl' : '' }, h('td', { text: t.name }), h('td', { text: fmtTime(d.rise) + '・' + azName(d.riseAz) }), h('td', { text: fmtTime(d.set) + '・' + azName(d.setAz) }), h('td', { text: '約 ' + Math.round(d.noonAlt) + '°' }));
      tbl.append(tr);
    });
  }
  function sync() {
    TERMS.forEach((t, i) => {
      const on = t.id === st.term;
      paths[t.id].setAttribute('stroke', t.color); paths[t.id].setAttribute('stroke-width', on ? 5 : 3);
      paths[t.id].setAttribute('opacity', on || st.compare ? (on ? 1 : 0.7) : 0.12);
      termBtns[i].classList.toggle('on', on);
    });
    const d = dayInfo(DECL[st.term]); const q = sunPos(DECL[st.term], st.hour);
    if (q.alt > 0) { sunDot.setAttribute('transform', `translate(${xOf(q.az).toFixed(1)},${yOf(q.alt).toFixed(1)})`); sunDot.setAttribute('opacity', 1); } else sunDot.setAttribute('opacity', 0);
    noonMark.setAttribute('x1', xOf(180)); noonMark.setAttribute('x2', xOf(180)); noonMark.setAttribute('y1', GY); noonMark.setAttribute('y2', TOPY);
    const name = TERMS.find((t) => t.id === st.term).name;
    const now = q.alt > 0 ? `${fmtTime(st.hour)} 太陽在${azName(q.az)}，高度角約 ${Math.round(q.alt)}°。` : `${fmtTime(st.hour)} 太陽不在地平線上（還沒日出或已日落）。`;
    out.textContent = `${name}：日出在${azName(d.riseAz)}、日落在${azName(d.setAz)}，中午 12 時太陽高度角約 ${Math.round(d.noonAlt)}°。${now}`;
    hourIn.value = st.hour; cmp.checked = st.compare; drawTable();
  }
  function stop() { st.playing = false; cancelAnimationFrame(raf); playBtn.textContent = '▶ 播放'; }
  function tick(ts) { if (!st.playing) return; if (last) st.hour += ((ts - last) / 1000) * 2; last = ts; if (st.hour > 19.5) st.hour = 4.5; sync(); raf = requestAnimationFrame(tick); }
  hourIn.addEventListener('input', () => { st.hour = +hourIn.value; sync(); bump(); });
  cmp.addEventListener('change', () => { st.compare = cmp.checked; sync(); bump(); });
  playBtn.addEventListener('click', () => {
    if (st.playing) { stop(); return; }
    if (reducedMotion()) { st.hour = st.hour >= 19 ? 5 : st.hour + 1; sync(); bump(); return; }
    st.playing = true; last = 0; playBtn.textContent = '⏸ 暫停'; raf = requestAnimationFrame(tick); bump();
  });
  if (reducedMotion()) playBtn.textContent = '＋1 小時';

  const alt = h('details', { class: 'static-alt' }, h('summary', { text: '看不到動畫？文字版說明' }),
    h('p', { text: '課本重點：春分、秋分日出在正東、日落在正西；夏至日出在東偏北、日落在西偏北；冬至日出在東偏南、日落在西偏南。中午 12 時的太陽高度角：夏至最大，冬至最小，春分和秋分在中間。上面的表格是依簡化模型算出的估計值。' }));

  root.classList.add('sim');
  root.append(h('div', { class: 'seg-row' }, ...termBtns), svg,
    h('div', { class: 'ctrl-box' }, h('label', {}, '時間 ', h('b', { text: '' }), hourIn), h('div', { class: 'row' }, playBtn, h('label', { class: 'chk' }, cmp, ' 比較四季'))),
    out, tbl, alt);
  sync();
  return { getState: () => ({ ...st }), actions: () => actions, destroy: stop };
}
