/* 天氣圖判讀（教材：六年級 天氣單元 b2）
 * 衛星雲圖：藍＝海洋、綠＝陸地、白＝雲；地面天氣圖：等壓線、高氣壓 H、低氣壓 L、鋒面符號。
 * 圖都是「示意圖」，不是真實的氣象資料。 */
import { h, s } from '../components/dom.js';

const SAT = {
  thick: { name: '厚重雲層覆蓋', text: '白色很多、很濃：雲層又廣又厚，水氣較多，降雨機率較高，可能是不穩定的陰雨天。' },
  thin: { name: '只有薄雲', text: '幾乎沒有雲（只有薄雲）：水氣較少，降雨機率較低，可能是晴天。' },
  band: { name: '長長的緞帶狀雲', text: '雲區像長長的緞帶：大多是鋒面雲帶，鋒面通過時容易下雨。' },
  spiral: { name: '熱帶海洋上的漩渦狀雲', text: '熱帶海洋出現漩渦狀雲區：可能有颱風形成；中間無雲的小區域就是颱風眼。' },
};
const SYM = {
  isobar: { name: '等壓線', text: '單位是百帕。同一條線經過的地方，氣壓值都相同；等壓線愈密集，氣壓變化愈快，風勢愈強。（數字是氣壓，不是溫度）' },
  high: { name: 'H 高氣壓中心', text: '中心氣壓最高，愈向外愈低；氣流穩定，天空幾乎沒有雲，天氣晴朗。' },
  low: { name: 'L 低氣壓中心', text: '中心氣壓最低，愈向外愈高；雲量較多，容易下雨，常是陰雨天。' },
  cold: { name: '冷鋒', text: '藍色三角形，尖端是冷氣團前進的方向。' },
  warm: { name: '暖鋒', text: '紅色半圓形，凸起是暖氣團前進的方向。' },
  stat: { name: '滯留鋒', text: '三角形和半圓形交錯，冷、暖氣團勢力相當。' },
};

export function mount(root, opts = {}) {
  const st = { mode: 'sat', sat: 'thick', show: { isobar: true, high: true, low: true, cold: false, warm: false, stat: false }, dense: 3, last: 'isobar' };
  let actions = 0; const bump = () => { actions++; opts.onAction && opts.onAction(actions); };
  const body = h('div', {}); const out = h('div', { class: 'readout', 'aria-live': 'polite' });
  const tabs = [['sat', '衛星雲圖'], ['ground', '地面天氣圖']].map(([m, n]) => h('button', { type: 'button', class: 'seg', onclick: () => { st.mode = m; render(); bump(); } }, n));

  function satSvg() {
    const svg = s('svg', { viewBox: '0 0 360 230', role: 'img', 'aria-label': '衛星雲圖示意：' + SAT[st.sat].name, class: 'sim-svg wide' });
    svg.append(s('rect', { width: 360, height: 230, fill: '#4f8fd8' }), s('path', { d: 'M 40 190 L 70 90 Q 90 50 130 70 Q 150 110 140 170 Q 100 215 40 190 Z', fill: '#6cb86a' }));
    const cl = (cx, cy, rx, ry, o, rot = 0) => s('ellipse', { cx, cy, rx, ry, fill: '#fff', opacity: o, transform: `rotate(${rot} ${cx} ${cy})` });
    if (st.sat === 'thick') [[110, 120, 100, 60, 0.95], [220, 90, 90, 50, 0.9], [250, 160, 80, 45, 0.9], [70, 70, 60, 35, 0.85]].forEach((a) => svg.append(cl(...a)));
    if (st.sat === 'thin') [[250, 60, 40, 12, 0.35], [300, 150, 36, 10, 0.3], [180, 190, 30, 8, 0.25]].forEach((a) => svg.append(cl(...a)));
    if (st.sat === 'band') [[80, 190, 50, 16, 0.9, -35], [140, 150, 55, 17, 0.92, -35], [200, 110, 55, 17, 0.92, -35], [260, 70, 55, 16, 0.9, -35], [315, 35, 40, 12, 0.85, -35]].forEach((a) => svg.append(cl(...a)));
    if (st.sat === 'spiral') { for (let a = 0; a < 4; a++) svg.append(s('path', { d: `M 255 115 q ${40 * Math.cos(a * 1.57)} ${-50 * Math.sin(a * 1.57)} ${70 * Math.cos(a * 1.57 + 1.2)} ${70 * Math.sin(a * 1.57 + 1.2)} t ${-50 * Math.cos(a * 1.57)} ${60 * Math.sin(a * 1.57)}`, fill: 'none', stroke: '#fff', 'stroke-width': 24, opacity: 0.9, 'stroke-linecap': 'round' })); svg.append(s('circle', { cx: 255, cy: 115, r: 40, fill: '#fff', opacity: 0.95 }), s('circle', { cx: 255, cy: 115, r: 9, fill: '#4f8fd8' })); }
    svg.append(s('text', { x: 10, y: 20, 'font-size': 12, fill: '#fff', 'font-weight': 700, text: '藍＝海洋　綠＝陸地　白＝雲（示意圖）' }));
    return svg;
  }
  function groundSvg() {
    const svg = s('svg', { viewBox: '0 0 360 240', role: 'img', 'aria-label': '地面天氣圖示意', class: 'sim-svg wide' });
    svg.append(s('rect', { width: 360, height: 240, fill: '#f4f8ee', stroke: '#3d2f3a', 'stroke-width': 2 }));
    const sp = 22 - st.dense * 3; // 等壓線愈密集（dense 大），間距愈小
    const ring = (cx, cy, i, label) => { const rx = 18 + i * sp, ry = 14 + i * sp * 0.8; svg.append(s('ellipse', { cx, cy, rx, ry, fill: 'none', stroke: '#7a6a4a', 'stroke-width': 2 }), s('text', { x: cx, y: cy - ry - 3, 'text-anchor': 'middle', 'font-size': 10, fill: '#7a6a4a', text: label })); };
    if (st.show.isobar) { [1, 2].forEach((i) => { ring(80, 110, i, String(1020 - i * 4)); ring(280, 140, i, String(1000 + i * 4)); }); }
    if (st.show.high) svg.append(s('text', { x: 80, y: 122, 'text-anchor': 'middle', 'font-size': 34, 'font-weight': 900, fill: '#2f6fd6', text: 'H' }));
    if (st.show.low) svg.append(s('text', { x: 280, y: 152, 'text-anchor': 'middle', 'font-size': 34, 'font-weight': 900, fill: '#e5484d', text: 'L' }));
    const tri = (x, y, dir) => (dir === 'down' ? s('path', { d: `M ${x - 9} ${y} L ${x + 9} ${y} L ${x} ${y + 13} Z`, fill: '#2f6fd6' }) : s('path', { d: `M ${x} ${y - 9} L ${x} ${y + 9} L ${x + 13} ${y} Z`, fill: '#2f6fd6' }));
    const semi = (x, y, dir) => (dir === 'up' ? s('path', { d: `M ${x - 9} ${y} A 9 9 0 0 1 ${x + 9} ${y} Z`, fill: '#e5484d' }) : s('path', { d: `M ${x} ${y - 9} A 9 9 0 0 0 ${x} ${y + 9} Z`, fill: '#e5484d' }));
    if (st.show.cold) { svg.append(s('line', { x1: 30, y1: 26, x2: 330, y2: 26, stroke: '#2f6fd6', 'stroke-width': 3 })); for (let x = 50; x < 330; x += 40) svg.append(tri(x, 26, 'down')); svg.append(s('text', { x: 336, y: 30, 'font-size': 11, fill: '#2f6fd6', 'text-anchor': 'end', text: '冷鋒' })); }
    if (st.show.warm) { svg.append(s('line', { x1: 30, y1: 214, x2: 330, y2: 214, stroke: '#e5484d', 'stroke-width': 3 })); for (let x = 50; x < 330; x += 40) svg.append(semi(x, 214, 'up')); svg.append(s('text', { x: 336, y: 232, 'font-size': 11, fill: '#e5484d', 'text-anchor': 'end', text: '暖鋒' })); }
    if (st.show.stat) { svg.append(s('line', { x1: 180, y1: 50, x2: 180, y2: 200, stroke: '#7a4aa8', 'stroke-width': 3 })); for (let i = 0, y = 62; y < 200; y += 24, i++) svg.append(i % 2 === 0 ? tri(180, y, 'right') : semi(180, y, 'left')); svg.append(s('text', { x: 186, y: 46, 'font-size': 11, fill: '#7a4aa8', text: '滯留鋒' })); }
    svg.append(s('text', { x: 10, y: 236, 'font-size': 11, fill: '#7d6d78', text: '示意圖：數字是氣壓（百帕），不是溫度' }));
    return svg;
  }
  function render() {
    tabs.forEach((b, i) => b.classList.toggle('on', ['sat', 'ground'][i] === st.mode));
    body.textContent = '';
    if (st.mode === 'sat') {
      body.append(satSvg(), h('div', { class: 'row' }, ...Object.entries(SAT).map(([k, v]) => h('button', { type: 'button', class: 'chip' + (st.sat === k ? ' on' : ''), onclick: () => { st.sat = k; render(); bump(); } }, v.name))));
      out.textContent = SAT[st.sat].text;
    } else {
      body.append(groundSvg(), h('div', { class: 'row' }, ...Object.entries(SYM).map(([k, v]) => h('button', { type: 'button', class: 'chip' + (st.show[k] ? ' on' : ''), 'aria-pressed': String(!!st.show[k]), onclick: () => { st.show[k] = !st.show[k]; st.last = k; render(); bump(); } }, v.name))),
        h('div', { class: 'ctrl-box' }, h('label', {}, '等壓線的疏密 ', h('b', { text: ['', '很疏', '疏', '中等', '密', '很密'][st.dense] }), h('input', { type: 'range', min: 1, max: 5, step: 1, value: st.dense, 'aria-label': '等壓線疏密', oninput: (e) => { st.dense = +e.target.value; st.last = 'isobar'; render(); bump(); } }))));
      const wind = ['', '很弱', '弱', '中等', '強', '很強'][st.dense];
      out.textContent = `${SYM[st.last].name}：${SYM[st.last].text}` + (st.last === 'isobar' ? ` 目前等壓線${['', '很疏', '疏', '中等', '密', '很密'][st.dense]}，風勢${wind}。` : '');
    }
  }
  const alt = h('details', { class: 'static-alt' }, h('summary', { text: '文字版說明（課本整理）' }), h('table', { class: 'tbl' }, h('tr', {}, h('th', { text: '符號' }), h('th', { text: '意思' })), ...Object.values(SYM).map((v) => h('tr', {}, h('td', { text: v.name }), h('td', { text: v.text })))),
    h('p', { class: 'note', text: '衛星雲圖：藍色＝海洋、綠色＝陸地、白色＝雲層；白色愈多雲層愈廣，白色愈濃雲層愈厚。' }));
  root.classList.add('sim');
  root.append(h('div', { class: 'sim-warn' }, '⚠ 這些都是教學用的示意圖，不是真實的衛星雲圖或天氣圖，也不能用來預報天氣。'), h('div', { class: 'seg-row' }, ...tabs), body, out, alt);
  render();
  return { getState: () => ({ ...st }), actions: () => actions, destroy() {} };
}
