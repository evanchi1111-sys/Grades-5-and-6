/* 熱的傳播比較（教學示意）：傳導、對流、輻射
 * 速度與溫度皆為「相對快慢」的示意，不是真實量測；結論取自課本（固體傳導、液體氣體對流、太陽的熱靠輻射）。 */
import { h, s, reducedMotion } from '../components/dom.js';

const MATS = { metal: { name: '金屬棒', c: 0.42 }, wood: { name: '木棒', c: 0.07 }, plastic: { name: '塑膠棒', c: 0.045 } };

export function mount(root, opts = {}) {
  const st = { mode: 'conduction', mat: 'metal', heat: false, shade: false, cup: 'black', playing: false };
  let actions = 0, raf = 0, last = 0, tick = 0; const bump = () => { actions++; opts.onAction && opts.onAction(actions); };
  const stage = h('div', {}); const out = h('div', { class: 'readout', 'aria-live': 'polite' }); const ctrl = h('div', { class: 'ctrl-box' });
  const tabs = ['conduction', 'convection', 'radiation'].map((m) => h('button', { type: 'button', class: 'seg', onclick: () => { st.mode = m; reset(); render(); bump(); } }, { conduction: '傳導', convection: '對流', radiation: '輻射' }[m]));

  // 傳導資料
  const N = 12; let T = new Array(N).fill(25);
  // 對流資料
  const P = Array.from({ length: 14 }, (_, i) => i / 14);
  // 輻射資料
  let rad = { black: 0, white: 0 };

  function reset() { T = new Array(N).fill(25); T[0] = 25; rad = { black: 0, white: 0 }; stop(); st.heat = false; st.playing = false; }
  function stop() { st.playing = false; cancelAnimationFrame(raf); }
  const colOf = (t) => { const a = Math.max(0, Math.min(1, (t - 25) / 45)); return `rgb(${Math.round(255 * (0.55 + 0.45 * a))},${Math.round(210 - 130 * a)},${Math.round(200 - 160 * a)})`; };

  function step(n = 1) {
    if (st.mode === 'conduction') { for (let k = 0; k < n; k++) { const c = MATS[st.mat].c; T[0] = 70; const nt = T.slice(); for (let i = 1; i < N; i++) { const r = i === N - 1 ? T[i - 1] : T[i + 1]; nt[i] = T[i] + c * (T[i - 1] + r - 2 * T[i]); } T = nt; } }
    if (st.mode === 'radiation') { const base = st.shade ? 0.4 : 1; rad.black = Math.min(100, rad.black + n * 2.2 * base); rad.white = Math.min(100, rad.white + n * 1.2 * base); }
  }
  function loop(ts) {
    if (!st.playing) return; const dt = last ? Math.min(0.1, (ts - last) / 1000) : 0; last = ts; tick += dt;
    if (st.mode === 'convection') { const v = st.heat ? 0.18 : 0; for (let i = 0; i < P.length; i++) P[i] = (P[i] + v * dt) % 1; }
    else step(Math.round(dt * 60) || 1);
    render(true); raf = requestAnimationFrame(loop);
  }
  function play() { if (reducedMotion()) { step(40); render(true); bump(); return; } st.playing = true; last = 0; raf = requestAnimationFrame(loop); }

  function drawConduction() {
    const svg = s('svg', { viewBox: '0 0 360 150', role: 'img', 'aria-label': MATS[st.mat].name + '加熱後的溫度分布', class: 'sim-svg wide' });
    svg.append(s('rect', { width: 360, height: 150, fill: '#f6fbff' }));
    for (let i = 0; i < N; i++) svg.append(s('rect', { x: 40 + i * 24, y: 60, width: 24, height: 30, fill: colOf(T[i]), stroke: '#3d2f3a', 'stroke-width': 1.5 }));
    svg.append(s('text', { x: 14, y: 82, 'font-size': 26, text: '🔥' }), s('text', { x: 180, y: 120, 'text-anchor': 'middle', 'font-size': 13, fill: '#4a3b45', text: '← 熱端　　　　　　　　　　　冷端 →　（顏色愈紅，溫度愈高）' }));
    return svg;
  }
  function drawConvection() {
    const svg = s('svg', { viewBox: '0 0 360 220', role: 'img', 'aria-label': '對流：熱的上升、冷的下沉', class: 'sim-svg wide' });
    svg.append(s('rect', { width: 360, height: 220, fill: '#f6fbff' }), s('rect', { x: 90, y: 20, width: 180, height: 150, rx: 10, fill: '#cfe6f7', stroke: '#3d2f3a', 'stroke-width': 3 }));
    if (st.heat) svg.append(s('text', { x: 100, y: 205, 'font-size': 24, text: '🔥' }));
    const L = 40, R = 220, Tt = 45, B = 150;
    P.forEach((u) => { const q = u * 4; let x, y, hot;
      if (q < 1) { x = L; y = B - (B - Tt) * q; hot = true; } else if (q < 2) { x = L + (R - L) * (q - 1); y = Tt; hot = true; } else if (q < 3) { x = R; y = Tt + (B - Tt) * (q - 2); hot = false; } else { x = R - (R - L) * (q - 3); y = B; hot = false; }
      svg.append(s('circle', { cx: 90 + 20 + x * 0.78 - 20, cy: y, r: 6, fill: st.heat ? (hot ? '#e5484d' : '#3a5fb5') : '#9ab', opacity: 0.9 })); });
    svg.append(s('text', { x: 180, y: 195, 'text-anchor': 'middle', 'font-size': 13, fill: '#4a3b45', text: st.heat ? '熱的上升（紅），冷的下沉（藍），一圈一圈循環' : '沒有加熱：水不會循環' }));
    return svg;
  }
  function drawRadiation() {
    const svg = s('svg', { viewBox: '0 0 360 220', role: 'img', 'aria-label': '輻射：太陽的熱與兩個杯子', class: 'sim-svg wide' });
    svg.append(s('rect', { width: 360, height: 220, fill: '#dff1fb' }), s('rect', { y: 170, width: 360, height: 50, fill: '#b9e3a4' }), s('text', { x: 20, y: 50, 'font-size': 44, text: '☀️' }));
    for (let i = 0; i < 5; i++) svg.append(s('line', { x1: 70 + i * 10, y1: 60 + i * 5, x2: 150 + i * 30, y2: 130, stroke: '#ffb703', 'stroke-width': 2, 'stroke-dasharray': '5 5', opacity: st.shade ? 0.25 : 0.9 }));
    if (st.shade) svg.append(s('text', { x: 200, y: 90, 'font-size': 44, text: '☂️' }));
    [['black', 150, '#2b2b2b', '黑杯'], ['white', 250, '#fff', '白杯']].forEach(([k, x, f, n]) => {
      svg.append(s('path', { d: `M ${x} 130 L ${x + 44} 130 L ${x + 38} 170 L ${x + 6} 170 Z`, fill: f, stroke: '#3d2f3a', 'stroke-width': 3 }), s('text', { x: x + 22, y: 188, 'text-anchor': 'middle', 'font-size': 12, text: n }),
        s('rect', { x, y: 195, width: 44, height: 10, fill: '#eee', stroke: '#3d2f3a' }), s('rect', { x, y: 195, width: 44 * rad[k] / 100, height: 10, fill: '#ff8a5c' }));
    });
    svg.append(s('text', { x: 180, y: 214, 'text-anchor': 'middle', 'font-size': 11, fill: '#7d6d78', text: '橘色條＝相對升溫（示意）' }));
    return svg;
  }

  function render(fast) {
    tabs.forEach((b, i) => b.classList.toggle('on', ['conduction', 'convection', 'radiation'][i] === st.mode));
    if (!fast) {
      ctrl.textContent = '';
      if (st.mode === 'conduction') ctrl.append(h('label', {}, '材料 ', h('select', { 'aria-label': '材料', onchange: (e) => { st.mat = e.target.value; reset(); render(); bump(); } }, ...Object.entries(MATS).map(([k, m]) => h('option', { value: k, selected: k === st.mat, text: m.name })))),
        h('div', { class: 'row' }, h('button', { type: 'button', class: 'btn btn-primary', onclick: () => { st.playing ? stop() : play(); bump(); render(); } }, st.playing ? '⏸ 暫停' : (reducedMotion() ? '＋加熱一段時間' : '🔥 加熱')), h('button', { type: 'button', class: 'btn', onclick: () => { reset(); render(); bump(); } }, '重設')));
      if (st.mode === 'convection') ctrl.append(h('div', { class: 'row' }, h('button', { type: 'button', class: 'btn btn-primary', onclick: () => { st.heat = !st.heat; if (st.heat) { st.playing = true; last = 0; reducedMotion() ? 0 : (raf = requestAnimationFrame(loop)); } else stop(); render(); bump(); } }, st.heat ? '熄火' : '🔥 在左下角加熱'), h('span', { class: 'note', text: '液體與氣體都靠對流傳熱（氣體：熱空氣上升、冷空氣下降）' })));
      if (st.mode === 'radiation') ctrl.append(h('label', { class: 'chk' }, h('input', { type: 'checkbox', checked: st.shade, onchange: (e) => { st.shade = e.target.checked; bump(); render(); } }), ' 撐傘（擋掉一部分輻射熱）'),
        h('div', { class: 'row' }, h('button', { type: 'button', class: 'btn btn-primary', onclick: () => { st.playing ? stop() : play(); bump(); render(); } }, st.playing ? '⏸ 暫停' : (reducedMotion() ? '＋曬一段時間' : '☀ 開始曬太陽')), h('button', { type: 'button', class: 'btn', onclick: () => { reset(); render(); bump(); } }, '重設')));
    }
    stage.textContent = ''; stage.append(st.mode === 'conduction' ? drawConduction() : st.mode === 'convection' ? drawConvection() : drawRadiation());
    out.textContent = st.mode === 'conduction' ? `${MATS[st.mat].name}：熱透過接觸，從高溫處傳到低溫處（傳導）。${st.mat === 'metal' ? '金屬傳熱比較快，所以鍋身用金屬。' : '木頭、塑膠傳熱比較慢，所以鍋子把手常用它們。'}`
      : st.mode === 'convection' ? '對流：熱隨著液體或氣體流動，從高溫處傳到低溫處。熱的上升、冷的下沉，所以冷氣機裝在高處、暖爐放在低處。'
        : '輻射：太陽的熱不需要借助任何物質，就能傳到地球。深色比較容易吸收輻射熱；撐傘、躲在樹蔭下可以擋掉一部分。';
  }
  root.classList.add('sim');
  const alt = h('details', { class: 'static-alt' }, h('summary', { text: '看不到動畫？文字版說明' }), h('table', { class: 'tbl' }, h('tr', {}, ...['方式', '怎麼傳', '主要介質', '例子'].map((x) => h('th', { text: x }))),
    ...[['傳導', '透過接觸，熱從高溫處往低溫處傳', '固體', '鍋子把熱傳給食物'], ['對流', '熱隨液體或氣體流動', '液體、氣體', '煮茶時水循環；開冷氣；暖爐'], ['輻射', '不需要借助任何物質', '不需介質', '太陽的熱傳到地球；烤火']].map((r) => h('tr', {}, ...r.map((c) => h('td', { text: c }))))),
    h('p', { class: 'note', text: '以上為課本整理。模擬中的快慢與升溫是相對的示意，不是真實量測。' }));
  root.append(h('div', { class: 'sim-warn' }, '⚠ 這是教學示意：傳熱快慢與溫度變化是「相對」的，不是真實量測。真實實驗用熱水、火源要小心，請由大人陪同。'), h('div', { class: 'seg-row' }, ...tabs), stage, ctrl, out, alt);
  render();
  return { getState: () => ({ ...st }), actions: () => actions, destroy: stop, advance(n) { step(n); render(true); }, temps: () => T.slice(), radiation: () => ({ ...rad }) }; // advance／temps／radiation 供測試使用
}
