/* 植物構造與水的路線（教材：五年級 植物單元 b2、b3）
 * 點選根、莖、葉、花看功能；紅色素水實驗看水怎麼走；缺水／澆水、陽光與光合作用。 */
import { h, s, reducedMotion } from '../components/dom.js';

const PARTS = {
  root: { name: '根', text: '抓住土壤固定植物，吸收水分和養分。' },
  stem: { name: '莖', text: '輸送水分、養分，支撐植物體。' },
  leaf: { name: '葉', text: '蒸散水分，利用陽光製造養分（光合作用）。' },
  flower: { name: '花', text: '雄蕊和雌蕊是繁殖的重要部位；花粉傳到雌蕊柱頭叫授粉，之後子房發育成果實、胚珠發育成種子。' },
};

export function mount(root, opts = {}) {
  const st = { part: null, dye: 0, wilt: false, sun: false, playing: false };
  if (opts.preset) Object.assign(st, opts.preset); // 老師示範可預先設定（例如 dye:3）
  let actions = 0, raf = 0, last = 0; const bump = () => { actions++; opts.onAction && opts.onAction(actions); };

  const svg = s('svg', { viewBox: '0 0 300 300', role: 'img', 'aria-label': '植物示意圖：根、莖、葉、花', class: 'sim-svg' });
  svg.append(s('rect', { width: 300, height: 300, fill: '#e8f6ff' }), s('rect', { y: 170, width: 300, height: 130, fill: '#c9a27a' }), s('line', { x1: 0, y1: 170, x2: 300, y2: 170, stroke: '#3d2f3a', 'stroke-width': 3 }));
  const gRoot = s('g', { 'data-p': 'root' }), gStem = s('g', { 'data-p': 'stem' }), gLeaf = s('g', { 'data-p': 'leaf' }), gFlower = s('g', { 'data-p': 'flower' });
  const dyeCol = '#e5484d';
  const rootLines = [[150, 172, 150, 270], [150, 190, 105, 250], [150, 190, 195, 250], [150, 215, 120, 280], [150, 215, 185, 282]];
  const rootEls = rootLines.map(([a, b, c, d]) => s('line', { x1: a, y1: b, x2: c, y2: d, stroke: '#8a5a44', 'stroke-width': 7, 'stroke-linecap': 'round' }));
  gRoot.append(...rootEls);
  const stem = s('rect', { x: 144, y: 70, width: 12, height: 100, rx: 5, fill: '#6cc56a', stroke: '#3d2f3a', 'stroke-width': 2 }); gStem.append(stem);
  const leafL = s('g', {}, s('ellipse', { cx: -38, cy: 0, rx: 42, ry: 16, fill: '#7fd47a', stroke: '#3d2f3a', 'stroke-width': 2 }));
  const leafR = s('g', {}, s('ellipse', { cx: 38, cy: 0, rx: 42, ry: 16, fill: '#7fd47a', stroke: '#3d2f3a', 'stroke-width': 2 }));
  gLeaf.append(leafL, leafR);
  gFlower.append(...[0, 72, 144, 216, 288].map((a) => s('ellipse', { cx: 150 + 17 * Math.sin((a * Math.PI) / 180), cy: 52 - 17 * Math.cos((a * Math.PI) / 180), rx: 10, ry: 10, fill: '#ff9fc0', stroke: '#3d2f3a', 'stroke-width': 2 })), s('circle', { cx: 150, cy: 52, r: 9, fill: '#ffd166', stroke: '#3d2f3a', 'stroke-width': 2 }));
  const dyeStem = s('rect', { x: 146, y: 170, width: 8, height: 0, fill: dyeCol, opacity: 0.8 }); const dyeLeafL = s('ellipse', { cx: -38, cy: 0, rx: 0, ry: 0, fill: dyeCol, opacity: 0.55 }); const dyeLeafR = s('ellipse', { cx: 38, cy: 0, rx: 0, ry: 0, fill: dyeCol, opacity: 0.55 });
  leafL.append(dyeLeafL); leafR.append(dyeLeafR);
  const sunEl = s('text', { x: 20, y: 50, 'font-size': 38, text: '☀️', opacity: 0 });
  const photo = s('g', { opacity: 0 }, s('text', { x: 205, y: 78, 'font-size': 12, 'font-weight': 700, fill: '#2b6a2b', text: '← 二氧化碳 + 水' }), s('text', { x: 205, y: 96, 'font-size': 12, 'font-weight': 700, fill: '#2b6a2b', text: '→ 養分 + 氧氣' }));
  svg.append(gRoot, gStem, dyeStem, s('g', { transform: 'translate(150,120)' }, gLeaf), gFlower, sunEl, photo);
  [gRoot, gStem, gLeaf, gFlower].forEach((g) => { g.style.cursor = 'pointer'; g.addEventListener('click', () => { st.part = g.dataset.p; sync(); bump(); }); });

  const out = h('div', { class: 'readout', 'aria-live': 'polite' });
  const partBtns = Object.entries(PARTS).map(([k, p]) => h('button', { type: 'button', class: 'chip', onclick: () => { st.part = k; sync(); bump(); } }, p.name));
  const dyeBtn = h('button', { type: 'button', class: 'btn' }, '🧪 紅色素水實驗');
  const wiltBtn = h('button', { type: 'button', class: 'btn' }, '缺水');
  const sunBtn = h('button', { type: 'button', class: 'btn' }, '☀ 有陽光');

  function sync() {
    partBtns.forEach((b, i) => b.classList.toggle('on', Object.keys(PARTS)[i] === st.part));
    [[gRoot, 'root'], [gStem, 'stem'], [gLeaf, 'leaf'], [gFlower, 'flower']].forEach(([g, k]) => g.setAttribute('opacity', !st.part || st.part === k ? 1 : 0.35));
    const d = st.dye; // 0～3：根→莖→葉
    rootEls.forEach((r) => r.setAttribute('stroke', d > 0 ? dyeCol : '#8a5a44'));
    dyeStem.setAttribute('y', 170 - 100 * Math.max(0, Math.min(1, d - 1))); dyeStem.setAttribute('height', 100 * Math.max(0, Math.min(1, d - 1)));
    const lf = Math.max(0, Math.min(1, d - 2)); [dyeLeafL, dyeLeafR].forEach((e) => { e.setAttribute('rx', 42 * lf); e.setAttribute('ry', 16 * lf); });
    leafL.setAttribute('transform', st.wilt ? 'rotate(38)' : 'rotate(-8)'); leafR.setAttribute('transform', st.wilt ? 'rotate(-38)' : 'rotate(8)');
    stem.setAttribute('transform', st.wilt ? 'rotate(8 150 170)' : 'rotate(0)');
    wiltBtn.textContent = st.wilt ? '💧 澆水' : '缺水'; sunEl.setAttribute('opacity', st.sun ? 1 : 0); photo.setAttribute('opacity', st.sun ? 1 : 0);
    sunBtn.textContent = st.sun ? '☁ 沒有陽光' : '☀ 有陽光';
    const bits = [];
    if (st.part) bits.push(`${PARTS[st.part].name}：${PARTS[st.part].text}`);
    if (d > 0) bits.push(d < 1 ? '紅色素水開始被根吸收…' : d < 2 ? '水從根進入，往莖送…' : d < 3 ? '水經過莖，送到葉…' : '根、莖、葉都變紅了：水從根進入、經莖送到葉（再從葉蒸散出去）。');
    if (st.wilt) bits.push('缺水時葉片枯萎下垂，澆水後會恢復挺直。');
    if (st.sun) bits.push('有陽光時，葉子把二氧化碳和水變成養分，並釋放氧氣。');
    out.textContent = bits.length ? bits.join(' ') : '點一點植物的根、莖、葉、花，或試試下面的按鈕。';
  }
  function stop() { st.playing = false; cancelAnimationFrame(raf); }
  function tick(ts) { if (!st.playing) return; if (last) st.dye = Math.min(3, st.dye + ((ts - last) / 1000) * 0.7); last = ts; sync(); if (st.dye >= 3) { st.playing = false; return; } raf = requestAnimationFrame(tick); }
  dyeBtn.addEventListener('click', () => {
    if (st.dye >= 3) st.dye = 0;
    if (reducedMotion()) { st.dye = Math.min(3, Math.floor(st.dye) + 1); sync(); bump(); return; }
    stop(); st.playing = true; last = 0; raf = requestAnimationFrame(tick); bump();
  });
  if (reducedMotion()) dyeBtn.textContent = '🧪 紅色素水（一步一步）';
  wiltBtn.addEventListener('click', () => { st.wilt = !st.wilt; sync(); bump(); });
  sunBtn.addEventListener('click', () => { st.sun = !st.sun; sync(); bump(); });

  const alt = h('details', { class: 'static-alt' }, h('summary', { text: '看不到動畫？文字版說明' }), h('table', { class: 'tbl' }, h('tr', {}, h('th', { text: '部位' }), h('th', { text: '主要功能' })),
    ...[['根', '抓住土壤固定植物，吸收水分和養分'], ['莖', '輸送水分、養分，支撐植物體'], ['葉', '蒸散水分，利用陽光製造養分']].map((r) => h('tr', {}, ...r.map((c) => h('td', { text: c }))))),
    h('p', { class: 'note', text: '水的路線：根吸收 → 莖輸送 → 葉蒸散到空氣中。紅色素水實驗：根、莖、葉都會變紅。' }));
  root.classList.add('sim');
  root.append(h('div', { class: 'sim-warn' }, '⚠ 這是示意圖：只表示構造和水的方向，不是真實的植物外形或速度。'), h('div', { class: 'sim-views' }, svg, h('div', {}, h('div', { class: 'row' }, ...partBtns), h('div', { class: 'row' }, dyeBtn, wiltBtn, sunBtn), out)), alt);
  sync();
  return { getState: () => ({ ...st }), actions: () => actions, destroy: stop };
}
