/* 水循環與露霜（教材：六年級 天氣單元 b1）
 * 水循環：蒸發、蒸散、凝結、降水、匯集、滲入，可逐步或播放。 露與霜：調整杯子溫度，看杯壁出現什麼。 */
import { h, s, reducedMotion } from '../components/dom.js';

const STAGES = [
  { id: 'evap', name: '蒸發', text: '海洋、湖泊等地表的水受熱後，變成氣態的水蒸氣。' },
  { id: 'transp', name: '蒸散', text: '植物體內的水，經由葉片以水蒸氣的形態散發到空氣中。' },
  { id: 'cond', name: '凝結', text: '水蒸氣遇冷變成液態的小水滴（通常附著在凝結核上），形成雲或霧。' },
  { id: 'rain', name: '降水', text: '從天空降落到地面的水，不論液態（雨）或固態（雪、冰雹）。' },
  { id: 'collect', name: '匯集', text: '雨水匯集或冰雪融化形成河流。' },
  { id: 'seep', name: '滲入', text: '水滲入地下成為地下水。' },
];

export function mount(root, opts = {}) {
  const st = { mode: 'cycle', stage: null, playing: false, cup: 25 };
  let actions = 0, timer = 0; const bump = () => { actions++; opts.onAction && opts.onAction(actions); };
  const body = h('div', {}); const out = h('div', { class: 'readout', 'aria-live': 'polite' });
  const tabs = [['cycle', '水循環'], ['dew', '露與霜']].map(([m, n]) => h('button', { type: 'button', class: 'seg', onclick: () => { st.mode = m; stop(); render(); bump(); } }, n));

  function cycleSvg() {
    const on = (id) => (st.stage === null || st.stage === id ? 1 : 0.18);
    const svg = s('svg', { viewBox: '0 0 360 250', role: 'img', 'aria-label': '水循環示意圖', class: 'sim-svg wide' });
    svg.append(s('rect', { width: 360, height: 250, fill: '#dff1fb' }), s('rect', { y: 200, width: 360, height: 50, fill: '#c9a27a' }), s('rect', { y: 205, width: 120, height: 45, fill: '#5b9fd6' }),
      s('path', { d: 'M 160 200 L 230 110 L 300 200 Z', fill: '#8fb46d', stroke: '#3d2f3a', 'stroke-width': 3 }), s('text', { x: 20, y: 40, 'font-size': 36, text: '☀️' }),
      s('text', { x: 40, y: 232, 'font-size': 12, 'font-weight': 700, fill: '#fff', text: '海洋' }));
    svg.append(s('g', { opacity: on('evap') }, ...[40, 70, 100].map((x) => s('path', { d: `M ${x} 200 q 6 -14 0 -28 q -6 -14 0 -28`, fill: 'none', stroke: '#6aa6d8', 'stroke-width': 3, 'stroke-dasharray': '4 3' })), s('text', { x: 110, y: 170, 'font-size': 12, 'font-weight': 700, fill: '#2a5d8f', text: '蒸發↑' })));
    svg.append(s('g', { opacity: on('transp') }, s('text', { x: 255, y: 185, 'font-size': 22, text: '🌳' }), s('path', { d: 'M 270 175 q 8 -20 0 -40', fill: 'none', stroke: '#6aa6d8', 'stroke-width': 3, 'stroke-dasharray': '4 3' }), s('text', { x: 280, y: 160, 'font-size': 12, 'font-weight': 700, fill: '#2a5d8f', text: '蒸散↑' })));
    svg.append(s('g', { opacity: on('cond') }, s('ellipse', { cx: 190, cy: 50, rx: 60, ry: 24, fill: '#fff', stroke: '#9ab', 'stroke-width': 2 }), s('ellipse', { cx: 230, cy: 42, rx: 40, ry: 20, fill: '#fff', stroke: '#9ab', 'stroke-width': 2 }), s('text', { x: 165, y: 54, 'font-size': 12, 'font-weight': 700, fill: '#2a5d8f', text: '凝結（雲）' })));
    svg.append(s('g', { opacity: on('rain') }, ...[170, 190, 210, 230].map((x) => s('line', { x1: x, y1: 80, x2: x - 6, y2: 108, stroke: '#3a7fc4', 'stroke-width': 3, 'stroke-linecap': 'round' })), s('text', { x: 250, y: 100, 'font-size': 12, 'font-weight': 700, fill: '#2a5d8f', text: '降水↓' })));
    svg.append(s('g', { opacity: on('collect') }, s('path', { d: 'M 255 150 Q 240 190 200 202 Q 150 206 120 214', fill: 'none', stroke: '#3a7fc4', 'stroke-width': 6, 'stroke-linecap': 'round' }), s('text', { x: 150, y: 196, 'font-size': 12, 'font-weight': 700, fill: '#2a5d8f', text: '匯集（河流）' })));
    svg.append(s('g', { opacity: on('seep') }, s('path', { d: 'M 175 206 L 175 238', stroke: '#3a7fc4', 'stroke-width': 4, 'stroke-dasharray': '3 3' }), s('text', { x: 186, y: 236, 'font-size': 12, 'font-weight': 700, fill: '#fff', text: '滲入（地下水）' })));
    return svg;
  }
  function dewSvg() {
    const t = st.cup, kind = t < 0 ? 'frost' : t < 25 ? 'dew' : 'none';
    const svg = s('svg', { viewBox: '0 0 360 200', role: 'img', 'aria-label': '杯子外壁的露與霜', class: 'sim-svg wide' });
    const c = Math.round(120 + 100 * ((t + 10) / 40)), fill = `rgb(${255 - Math.round(150 * (1 - Math.max(0, Math.min(1, (t + 10) / 40))))},${Math.round(200 + 40 * ((t + 10) / 40))},255)`;
    svg.append(s('rect', { width: 360, height: 200, fill: '#f6fbff' }), s('path', { d: 'M 130 40 L 230 40 L 215 170 L 145 170 Z', fill, stroke: '#3d2f3a', 'stroke-width': 3 }), s('text', { x: 180, y: 110, 'text-anchor': 'middle', 'font-size': 18, 'font-weight': 700, fill: '#3d2f3a', text: t + '°C' }));
    if (kind === 'dew') for (let i = 0; i < 12; i++) svg.append(s('circle', { cx: 120 + ((i * 53) % 120) + (i % 2) * 6, cy: 55 + ((i * 37) % 100), r: 4, fill: '#7ec3ff', stroke: '#3a7fc4' }));
    if (kind === 'frost') for (let i = 0; i < 14; i++) svg.append(s('text', { x: 118 + ((i * 47) % 120), y: 62 + ((i * 31) % 100), 'font-size': 14, fill: '#6aa6d8', text: '❄' }));
    svg.append(s('text', { x: 180, y: 192, 'text-anchor': 'middle', 'font-size': 13, fill: '#4a3b45', text: '室溫約 25°C' }));
    return svg;
  }
  function render() {
    tabs.forEach((b, i) => b.classList.toggle('on', ['cycle', 'dew'][i] === st.mode));
    body.textContent = '';
    if (st.mode === 'cycle') {
      body.append(cycleSvg(), h('div', { class: 'row' }, ...STAGES.map((g) => h('button', { type: 'button', class: 'chip' + (st.stage === g.id ? ' on' : ''), onclick: () => { stop(); st.stage = g.id; render(); bump(); } }, g.name)), h('button', { type: 'button', class: 'btn btn-primary', onclick: () => { st.playing ? stop() : play(); render(); bump(); } }, st.playing ? '⏸ 暫停' : (reducedMotion() ? '下一個階段' : '▶ 播放循環'))));
      const g = STAGES.find((x) => x.id === st.stage);
      out.textContent = g ? `${g.name}：${g.text}` : '水循環：地表的水遇熱蒸發或蒸散 → 水蒸氣遇冷凝結成小水滴或冰晶，形成雲、霧、雨、露、霜 → 水透過降水回到地表。點一個階段看看。';
    } else {
      const t = st.cup, kind = t < 0 ? '霜' : t < 25 ? '露' : '沒有變化';
      body.append(dewSvg(), h('div', { class: 'ctrl-box' }, h('label', {}, '杯內溫度 ', h('b', { text: t + '°C' }), h('input', { type: 'range', min: -10, max: 30, step: 1, value: t, 'aria-label': '杯內溫度', oninput: (e) => { st.cup = +e.target.value; render(); bump(); } })),
        h('div', { class: 'row' }, ...[['A 常溫水', 25], ['B 水加冰塊', 5], ['C 冰塊加食鹽', -5]].map(([n, v]) => h('button', { type: 'button', class: 'chip', onclick: () => { st.cup = v; render(); bump(); } }, n + '（' + v + '°C）')))));
      out.textContent = `杯內 ${t}°C：杯子外壁${kind === '沒有變化' ? '沒有變化' : kind === '露' ? '出現小水滴（露）：杯壁溫度低於室溫、但高於 0°C，水蒸氣凝結成小水滴' : '出現白色固態的霜：溫度低於 0°C，水蒸氣直接變成冰晶'}。`;
    }
  }
  function stop() { st.playing = false; clearInterval(timer); }
  function advance() { const i = STAGES.findIndex((g) => g.id === st.stage); st.stage = STAGES[(i + 1) % STAGES.length].id; render(); }
  function play() { if (reducedMotion()) { advance(); return; } st.playing = true; advance(); timer = setInterval(advance, 2200); }
  const alt = h('details', { class: 'static-alt' }, h('summary', { text: '文字版說明（課本整理）' }), h('table', { class: 'tbl' }, h('tr', {}, h('th', { text: '名詞' }), h('th', { text: '意思' })), ...STAGES.map((g) => h('tr', {}, h('td', { text: g.name }), h('td', { text: g.text })))),
    h('table', { class: 'tbl' }, h('tr', {}, ...['組別', '杯內溫度', '杯子外壁'].map((x) => h('th', { text: x }))), ...[['A 常溫水', '25°C', '沒有變化'], ['B 水加冰塊', '5°C', '出現小水滴（露）'], ['C 冰塊加食鹽', '−5°C', '出現白色固態的霜']].map((r) => h('tr', {}, ...r.map((c) => h('td', { text: c }))))));
  root.classList.add('sim');
  root.append(h('div', { class: 'sim-warn' }, '⚠ 這是示意圖：只表示水的流向與名詞；真實的露和霜實驗請由大人陪同，冰塊加食鹽會非常冰。'), h('div', { class: 'seg-row' }, ...tabs), body, out, alt);
  render();
  return { getState: () => ({ ...st }), actions: () => actions, destroy: stop };
}
