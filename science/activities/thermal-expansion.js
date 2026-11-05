/* 熱脹冷縮實驗室（教學示意）
 * 氣體（錐形瓶＋氣球）、液體（紅水＋玻璃管）、固體（銅球和銅環），水溫可調；右側是粒子示意。
 * 注意：膨脹量為了看得清楚而「放大」，三者的相對大小順序（氣體最明顯、固體最不明顯）取自課本，數值不是真實膨脹係數。 */
import { h, s } from '../components/dom.js';

const K = { gas: 1.0, liquid: 0.35, solid: 0.07 };      // 相對明顯程度（示意）
const NAME = { gas: '氣體（錐形瓶＋氣球）', liquid: '液體（紅水＋玻璃管）', solid: '固體（銅球和銅環）' };
const DEG = { gas: '最明顯', liquid: '中間', solid: '最不明顯' };

export function mount(root, opts = {}) {
  const readonly = !!opts.readonly;
  const st = { mat: (opts.preset && opts.preset.state) || 'gas', temp: (opts.preset && opts.preset.temp) ?? 25 };
  let actions = 0; const bump = () => { actions++; opts.onAction && opts.onAction(actions); };
  const ex = () => (st.temp - 25) / 55; // −0.45（冰水）～ +1（熱水 80°C）

  const bath = s('rect', { x: 8, y: 150, width: 224, height: 95, rx: 12, stroke: '#3d2f3a', 'stroke-width': 3 });
  const scene = s('svg', { viewBox: '0 0 240 250', role: 'img', 'aria-label': '實驗示意圖', class: 'sim-svg' });
  scene.append(s('rect', { width: 240, height: 250, fill: '#f6fbff' }), bath);
  const obj = s('g', {}); scene.append(obj);
  const tag = s('text', { x: 120, y: 244, 'text-anchor': 'middle', 'font-size': 14, 'font-weight': 700, fill: '#4a3b45' }); scene.append(tag);

  const pSvg = s('svg', { viewBox: '0 0 240 250', role: 'img', 'aria-label': '粒子示意圖', class: 'sim-svg' });
  const pg = s('g', {}); pSvg.append(s('rect', { width: 240, height: 250, fill: '#fffaf0' }), s('text', { x: 120, y: 24, 'text-anchor': 'middle', 'font-size': 14, 'font-weight': 700, fill: '#4a3b45', text: '粒子示意（粒子大小不變）' }), pg);
  const pNote = s('text', { x: 120, y: 238, 'text-anchor': 'middle', 'font-size': 13, fill: '#7d6d78' }); pSvg.append(pNote);

  const out = h('div', { class: 'readout', 'aria-live': 'polite' });
  const tIn = h('input', { type: 'range', min: 0, max: 80, step: 1, value: st.temp, 'aria-label': '水溫（°C）' });
  const tV = h('b', {});
  const matBtns = Object.keys(NAME).map((k) => h('button', { type: 'button', class: 'seg', onclick: () => { st.mat = k; draw(); bump(); } }, k === 'gas' ? '氣體' : k === 'liquid' ? '液體' : '固體'));

  function col(t) { const a = Math.max(0, Math.min(1, t / 80)); const r = Math.round(120 + 135 * a), g = Math.round(190 - 70 * a), b = Math.round(255 - 190 * a); return `rgb(${r},${g},${b})`; }

  function drawObject() {
    obj.textContent = '';
    const e = ex() * K[st.mat];
    bath.setAttribute('fill', col(st.temp));
    if (st.mat === 'gas') {
      const r = 26 * (1 + e * 0.75);
      obj.append(s('path', { d: 'M 95 150 L 145 150 L 130 100 L 110 100 Z', fill: '#e8f4fb', stroke: '#3d2f3a', 'stroke-width': 3 }), s('rect', { x: 108, y: 88, width: 24, height: 14, fill: '#e8f4fb', stroke: '#3d2f3a', 'stroke-width': 3 }),
        s('ellipse', { cx: 120, cy: 88 - r, rx: r, ry: r * 1.15, fill: '#ff8fb1', stroke: '#3d2f3a', 'stroke-width': 3, opacity: 0.92 }));
      tag.textContent = '氣球' + (st.temp > 28 ? '膨脹' : st.temp < 22 ? '變扁、內凹' : '大小正常');
    } else if (st.mat === 'liquid') {
      const lv = 92 - e * 78;
      obj.append(s('path', { d: 'M 85 150 L 155 150 L 155 120 Q 155 108 140 108 L 100 108 Q 85 108 85 120 Z', fill: '#e8f4fb', stroke: '#3d2f3a', 'stroke-width': 3 }),
        s('rect', { x: 113, y: 20, width: 14, height: 90, fill: '#fff', stroke: '#3d2f3a', 'stroke-width': 3 }),
        s('rect', { x: 86, y: 118, width: 68, height: 30, fill: '#e5484d', opacity: 0.85 }), s('rect', { x: 114.5, y: Math.max(22, lv), width: 11, height: Math.max(0, 108 - Math.max(22, lv)), fill: '#e5484d', opacity: 0.85 }),
        s('line', { x1: 108, y1: 92, x2: 132, y2: 92, stroke: '#3d2f3a', 'stroke-width': 2, 'stroke-dasharray': '3 3' }), s('text', { x: 138, y: 96, 'font-size': 11, fill: '#3d2f3a', text: '常溫水位' }));
      tag.textContent = '玻璃管水位' + (st.temp > 28 ? '上升' : st.temp < 22 ? '下降' : '不變');
    } else {
      const rb = 22 * (1 + e * 0.35), passes = st.temp <= 28; // 常溫範圍（22～28°C）內剛好通過
      obj.append(s('rect', { x: 60, y: 62, width: 120, height: 6, fill: '#8a5a44', stroke: '#3d2f3a', 'stroke-width': 2 }), s('rect', { x: 66, y: 68, width: 6, height: 50, fill: '#8a5a44' }), s('rect', { x: 168, y: 68, width: 6, height: 50, fill: '#8a5a44' }),
        s('ellipse', { cx: 120, cy: 60, rx: 24, ry: 6, fill: 'none', stroke: '#b87333', 'stroke-width': 5 }));
      const by = passes ? 120 : 40;
      obj.append(s('circle', { cx: 120, cy: by, r: rb, fill: '#d98a45', stroke: '#3d2f3a', 'stroke-width': 3 }));
      if (passes) obj.append(s('text', { x: 120, y: 190, 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 700, fill: '#2b8a3e', text: '↓ 可以通過銅環' }));
      else obj.append(s('text', { x: 120, y: 190, 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 700, fill: '#c0392b', text: '✕ 無法通過銅環' }));
      tag.textContent = '銅球' + (st.temp > 28 ? '受熱，體積變大' : st.temp < 22 ? '遇冷，體積變小' : '常溫（剛好通過）');
    }
  }
  function drawParticles() {
    pg.textContent = '';
    const e = ex() * K[st.mat], sp = 30 * (1 + e * (st.mat === 'gas' ? 0.9 : st.mat === 'liquid' ? 0.4 : 0.12));
    const cols = 5, rows = 5, w = (cols - 1) * sp, ox = 120 - w / 2, oy = 130 - ((rows - 1) * sp) / 2;
    for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
      const jit = st.mat === 'gas' ? ((i * 7 + j * 13) % 9 - 4) * 4 : st.mat === 'liquid' ? ((i * 5 + j * 3) % 5 - 2) * 2 : 0;
      pg.append(s('circle', { cx: ox + j * sp + jit, cy: oy + i * sp - jit * 0.6, r: 8, fill: '#7aa6e0', stroke: '#3d2f3a', 'stroke-width': 2 }));
    }
    pNote.textContent = '受熱：粒子間距離變大；遇冷：變小';
  }
  function draw() {
    matBtns.forEach((b, i) => b.classList.toggle('on', Object.keys(NAME)[i] === st.mat));
    tV.textContent = st.temp + '°C'; tIn.value = st.temp;
    drawObject(); drawParticles();
    const state = st.temp > 28 ? '受熱' : st.temp < 22 ? '遇冷' : '常溫';
    out.textContent = `${NAME[st.mat]}：${state}。` + (state === '受熱' ? '體積變大（膨脹）。' : state === '遇冷' ? '體積變小（收縮）。' : '保持原來的大小。') + `熱脹冷縮的程度：${DEG[st.mat]}。粒子本身沒有變大，變大的是粒子之間的間隔。`;
  }
  tIn.addEventListener('input', () => { st.temp = +tIn.value; draw(); bump(); });
  const presets = h('div', { class: 'row' }, ...[['冰水', 0], ['常溫', 25], ['熱水', 70]].map(([n, t]) => h('button', { type: 'button', class: 'chip', onclick: () => { st.temp = t; draw(); bump(); } }, n + ' ' + t + '°C')));
  const safety = h('div', { class: 'sim-warn' }, '⚠ 這是示意圖：為了看得清楚，膨脹量被放大；三種狀態的相對大小取自課本，不是真實量測值。真實實驗用熱水要小心，避免燙傷。');
  const alt = h('details', { class: 'static-alt' }, h('summary', { text: '看不到動畫？文字版說明' }), h('table', { class: 'tbl' },
    h('tr', {}, ...['', '受熱後', '遇冷後'].map((x) => h('th', { text: x }))),
    ...[['氣體（錐形瓶＋氣球）', '瓶內空氣體積變大，氣球膨脹', '瓶內空氣體積變小，氣球變扁或內凹'], ['液體（紅墨水＋玻璃管）', '水體積變大，玻璃管水位上升', '水體積變小，玻璃管水位下降'], ['固體（銅球和銅環）', '銅球體積變大，無法通過銅環', '銅球體積變小，可以通過銅環']].map((r) => h('tr', {}, ...r.map((c) => h('td', { text: c }))))));
  root.classList.add('sim');
  root.append(...[readonly ? null : safety, readonly ? null : h('div', { class: 'seg-row' }, ...matBtns), h('div', { class: 'sim-views' }, scene, pSvg),
    readonly ? null : h('div', { class: 'ctrl-box' }, h('label', {}, '水溫 ', tV, tIn), presets), out, alt].filter(Boolean));
  draw();
  return { getState: () => ({ ...st }), actions: () => actions, destroy() {}, set(p) { Object.assign(st, p); draw(); } };
}
