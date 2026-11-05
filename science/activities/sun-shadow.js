/* 太陽與影子模擬器
 * 左圖：從正上方看（北在上），太陽在圓周上，影子在竿子的另一邊。
 * 右圖：從側面看，顯示太陽高度與影子長度的關係。
 * 模式：自由調整（高度＋方位）／一天的太陽（春秋分軌跡，時間滑桿＋播放）。 */
import { h, s, reducedMotion } from '../components/dom.js';
import { DECL, sunPos, azName, oppositeAz, shadowRatio, fmtTime, rad } from './astro.js';

export function mount(root, opts = {}) {
  const readonly = !!opts.readonly;
  const st = { mode: opts.preset && opts.preset.day ? 'day' : 'free', alt: 45, az: 135, hour: 9, playing: false };
  if (opts.preset) { st.alt = opts.preset.alt ?? st.alt; st.az = opts.preset.az ?? st.az; }
  if (st.mode === 'day') { const p = sunPos(DECL.spring, st.hour); st.alt = p.alt; st.az = p.az; }
  let actions = 0, raf = 0, last = 0;
  const bump = () => { actions++; opts.onAction && opts.onAction(actions); };

  const C = 180, R = 140;
  const top = s('svg', { viewBox: '0 0 360 360', role: 'img', 'aria-label': '俯視圖：太陽與竿影', class: 'sim-svg' });
  top.append(s('circle', { cx: C, cy: C, r: R, fill: '#e9f7df', stroke: '#3d2f3a', 'stroke-width': 3 }));
  [['北', 0], ['東', 90], ['南', 180], ['西', 270]].forEach(([n, a]) => {
    const x = C + (R + 18) * Math.sin(rad(a)), y = C - (R + 18) * Math.cos(rad(a));
    top.append(s('text', { x, y: y + 6, 'text-anchor': 'middle', 'font-size': 20, 'font-weight': 700, fill: '#4a3b45', text: n }));
    top.append(s('line', { x1: C + (R - 8) * Math.sin(rad(a)), y1: C - (R - 8) * Math.cos(rad(a)), x2: C + R * Math.sin(rad(a)), y2: C - R * Math.cos(rad(a)), stroke: '#3d2f3a', 'stroke-width': 3 }));
  });
  [45, 135, 225, 315].forEach((a) => top.append(s('line', { x1: C + (R - 6) * Math.sin(rad(a)), y1: C - (R - 6) * Math.cos(rad(a)), x2: C + R * Math.sin(rad(a)), y2: C - R * Math.cos(rad(a)), stroke: '#9b8f88', 'stroke-width': 2 })));
  const shadow = s('line', { x1: C, y1: C, x2: C, y2: C, stroke: '#4a3b45', 'stroke-width': 9, 'stroke-linecap': 'round', opacity: 0.55 });
  const ray = s('line', { x1: C, y1: C, x2: C, y2: C, stroke: '#ffb703', 'stroke-width': 2, 'stroke-dasharray': '5 5' });
  const sunG = s('g', {}, s('circle', { r: 17, fill: '#ffd166', stroke: '#e0a23a', 'stroke-width': 3 }), s('text', { y: 6, 'text-anchor': 'middle', 'font-size': 18, text: '☀' }));
  const pole = s('circle', { cx: C, cy: C, r: 7, fill: '#8a5a44', stroke: '#3d2f3a', 'stroke-width': 2 });
  top.append(ray, shadow, pole, sunG);

  const side = s('svg', { viewBox: '0 0 360 220', role: 'img', 'aria-label': '側視圖：太陽高度與影長', class: 'sim-svg' });
  side.append(s('rect', { x: 0, y: 0, width: 360, height: 220, fill: '#dff1fb' }), s('rect', { x: 0, y: 170, width: 360, height: 50, fill: '#b9e3a4' }), s('line', { x1: 0, y1: 170, x2: 360, y2: 170, stroke: '#3d2f3a', 'stroke-width': 3 }));
  const PX = 110, PH = 70;
  const sideShadow = s('line', { x1: PX, y1: 172, x2: PX, y2: 172, stroke: '#4a3b45', 'stroke-width': 8, 'stroke-linecap': 'round', opacity: 0.55 });
  const sideRay = s('line', { stroke: '#ffb703', 'stroke-width': 2, 'stroke-dasharray': '5 5' });
  const sidePole = s('line', { x1: PX, y1: 170, x2: PX, y2: 170 - PH, stroke: '#8a5a44', 'stroke-width': 8, 'stroke-linecap': 'round' });
  const sideSun = s('g', {}, s('circle', { r: 14, fill: '#ffd166', stroke: '#e0a23a', 'stroke-width': 3 }));
  const arc = s('path', { fill: 'none', stroke: '#e0a23a', 'stroke-width': 2 });
  const altLabel = s('text', { 'font-size': 14, fill: '#7a5a2a', 'font-weight': 700 });
  side.append(sideShadow, sidePole, sideRay, arc, altLabel, sideSun);

  const out = h('div', { class: 'readout', 'aria-live': 'polite' });
  const altIn = h('input', { type: 'range', min: 5, max: 90, step: 1, value: Math.round(st.alt), 'aria-label': '太陽高度角（度）' });
  const azIn = h('input', { type: 'range', min: 0, max: 355, step: 5, value: Math.round(st.az / 5) * 5, 'aria-label': '太陽方位角（度，北為0）' });
  const hourIn = h('input', { type: 'range', min: 6, max: 18, step: 0.05, value: st.hour, 'aria-label': '一天中的時間' });
  const playBtn = h('button', { type: 'button', class: 'btn', 'aria-pressed': 'false' }, '▶ 播放一天');
  const modeFree = h('button', { type: 'button', class: 'seg on' }, '自由調整');
  const modeDay = h('button', { type: 'button', class: 'seg' }, '一天的太陽');
  const freeBox = h('div', { class: 'ctrl-box' },
    h('label', {}, '太陽高度角 ', h('b', { class: 'v-alt' }), altIn),
    h('label', {}, '太陽方位 ', h('b', { class: 'v-az' }), azIn),
    h('div', { class: 'row' }, ...[['東', 90], ['東南', 135], ['南', 180], ['西南', 225], ['西', 270]].map(([n, a]) => h('button', { type: 'button', class: 'chip', onclick: () => { st.az = a; sync(); bump(); } }, '太陽在' + n))));
  const dayBox = h('div', { class: 'ctrl-box' },
    h('label', {}, '時間 ', h('b', { class: 'v-hour' }), hourIn),
    h('div', { class: 'row' }, playBtn, h('span', { class: 'note', text: '用春分／秋分的太陽軌跡（模型）' })));

  function draw() {
    const az = st.az, alt = st.alt;
    const sx = C + R * Math.sin(rad(az)), sy = C - R * Math.cos(rad(az));
    sunG.setAttribute('transform', `translate(${sx.toFixed(1)},${sy.toFixed(1)})`);
    ray.setAttribute('x2', sx.toFixed(1)); ray.setAttribute('y2', sy.toFixed(1));
    const ratio = shadowRatio(alt), len = Math.min(R - 6, 42 * ratio), sa = oppositeAz(az);
    shadow.setAttribute('x2', (C + len * Math.sin(rad(sa))).toFixed(1)); shadow.setAttribute('y2', (C - len * Math.cos(rad(sa))).toFixed(1));
    shadow.setAttribute('opacity', alt < 1 ? 0 : 0.55);
    // 側視圖
    const tipX = PX, tipY = 170 - PH, d = 150, ux = -Math.cos(rad(alt)), uy = -Math.sin(rad(alt));
    sideSun.setAttribute('transform', `translate(${(tipX + ux * d).toFixed(1)},${(tipY + uy * d).toFixed(1)})`);
    sideRay.setAttribute('x1', (tipX + ux * d).toFixed(1)); sideRay.setAttribute('y1', (tipY + uy * d).toFixed(1));
    const gx = Math.min(350, PX + PH * ratio); sideRay.setAttribute('x2', gx.toFixed(1)); sideRay.setAttribute('y2', 170);
    sideShadow.setAttribute('x2', gx.toFixed(1));
    const ar = 34; arc.setAttribute('d', `M ${gx + 0} 170`); // 角度標記放在影子端點
    const a0x = gx - ar, a0y = 170; const a1x = gx - ar * Math.cos(rad(alt)), a1y = 170 - ar * Math.sin(rad(alt));
    arc.setAttribute('d', gx - ar > PX + 5 ? `M ${a0x.toFixed(1)} ${a0y} A ${ar} ${ar} 0 0 1 ${a1x.toFixed(1)} ${a1y.toFixed(1)}` : '');
    altLabel.setAttribute('x', Math.max(PX + 8, gx - ar - 40)); altLabel.setAttribute('y', 160); altLabel.textContent = Math.round(alt) + '°';
    // 文字
    const sunN = azName(az), shN = azName(sa);
    const longTxt = ratio > 3 ? '很長' : ratio > 1.4 ? '比較長' : ratio > 0.7 ? '中等' : '很短';
    out.textContent = `太陽在${sunN}，影子在${shN}（相反方向）。太陽高度角約 ${Math.round(alt)}°，影子${longTxt}，約是竿高的 ${ratio < 10 ? ratio.toFixed(1) : '10 以上'} 倍。`;
    freeBox.querySelector('.v-alt').textContent = Math.round(alt) + '°';
    freeBox.querySelector('.v-az').textContent = Math.round(az) + '°（' + sunN + '）';
    dayBox.querySelector('.v-hour').textContent = fmtTime(st.hour);
  }
  function sync() {
    if (st.mode === 'day') { const p = sunPos(DECL.spring, st.hour); st.alt = Math.max(2, p.alt); st.az = p.az; hourIn.value = st.hour; }
    else { altIn.value = Math.round(st.alt); azIn.value = Math.round(st.az / 5) * 5; }
    if (st.mode === 'day' && (st.hour < 6.2 || st.hour > 17.8)) { /* 保持在 6～18 */ }
    draw();
  }
  function setMode(m) {
    st.mode = m; modeFree.classList.toggle('on', m === 'free'); modeDay.classList.toggle('on', m === 'day');
    freeBox.hidden = m !== 'free'; dayBox.hidden = m !== 'day'; if (m === 'free') stop(); sync();
  }
  function stop() { st.playing = false; cancelAnimationFrame(raf); playBtn.textContent = '▶ 播放一天'; playBtn.setAttribute('aria-pressed', 'false'); }
  function tick(ts) {
    if (!st.playing) return; if (last) st.hour += ((ts - last) / 1000) * 1.6; last = ts;
    if (st.hour > 18) st.hour = 6; sync(); raf = requestAnimationFrame(tick);
  }
  altIn.addEventListener('input', () => { st.alt = +altIn.value; sync(); bump(); });
  azIn.addEventListener('input', () => { st.az = +azIn.value; sync(); bump(); });
  hourIn.addEventListener('input', () => { st.hour = +hourIn.value; sync(); bump(); });
  modeFree.addEventListener('click', () => { setMode('free'); bump(); });
  modeDay.addEventListener('click', () => { setMode('day'); bump(); });
  playBtn.addEventListener('click', () => {
    if (st.playing) { stop(); return; }
    if (reducedMotion()) { st.hour = st.hour >= 18 ? 6 : Math.min(18, st.hour + 1); sync(); bump(); return; } // 減少動態：改成每按一次前進 1 小時
    st.playing = true; last = 0; playBtn.textContent = '⏸ 暫停'; playBtn.setAttribute('aria-pressed', 'true'); raf = requestAnimationFrame(tick); bump();
  });
  if (reducedMotion()) playBtn.textContent = '＋1 小時';

  const alt = h('details', { class: 'static-alt' }, h('summary', { text: '看不到動畫？文字版說明' }),
    h('table', { class: 'tbl' }, h('tr', {}, h('th', { text: '時間' }), h('th', { text: '太陽方位' }), h('th', { text: '影子方位' }), h('th', { text: '影子長度' })),
      ...[['9:00', '東偏南', '西偏北', '上午到中午愈來愈短'], ['12:00', '南方', '北方', '最短'], ['15:00', '西偏南', '東偏北', '中午過後愈來愈長']].map((r) => h('tr', {}, ...r.map((c) => h('td', { text: c }))))),
    h('p', { class: 'note', text: '以上是課本表格；影子永遠在太陽的相反方向，太陽高度角愈大影子愈短。' }));

  const ctrl = readonly ? null : h('div', { class: 'seg-row' }, modeFree, modeDay);
  root.classList.add('sim');
  root.append(...[ctrl, h('div', { class: 'sim-views' }, top, side), readonly ? null : freeBox, readonly ? null : dayBox, out, alt].filter(Boolean));
  if (!readonly) setMode(st.mode); else sync();
  return {
    getState: () => ({ ...st }), actions: () => actions,
    destroy() { stop(); },
    set(p) { Object.assign(st, p); sync(); },
  };
}
