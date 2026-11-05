/* 氣團與鋒面（教材：六年級 天氣單元 b3）
 * 調整冷、暖氣團的強弱，看鋒面怎麼移動、屬於哪一種鋒面。延伸知識放在獨立區塊並標明「課本沒有寫」。 */
import { h, s, reducedMotion } from '../components/dom.js';

const ROWS = {
  cold: { name: '冷鋒', how: '較強的冷氣團前進，迫使暖氣團後退', wx: '常出現明顯的雨勢，鋒面通過後氣溫降低；臺灣冬季常受影響' },
  warm: { name: '暖鋒', how: '較強的暖氣團前進，迫使冷氣團後退', wx: '暖鋒通過的地區氣溫升高，且發生降雨；臺灣的地理位置不易出現暖鋒' },
  stat: { name: '滯留鋒', how: '冷、暖氣團勢力相當，鋒面來回移動或停留不動', wx: '天氣不穩定，持續性下雨；臺灣在春、夏交會時容易出現（梅雨）' },
};

export function mount(root, opts = {}) {
  const st = { cold: 3, warm: 3, t: 0, playing: false };
  let actions = 0, raf = 0, last = 0; const bump = () => { actions++; opts.onAction && opts.onAction(actions); };
  const kind = () => (st.cold > st.warm ? 'cold' : st.cold < st.warm ? 'warm' : 'stat');
  const svgBox = h('div', {}); const out = h('div', { class: 'readout', 'aria-live': 'polite' }); const tbl = h('table', { class: 'tbl' });
  const cIn = h('input', { type: 'range', min: 1, max: 5, step: 1, value: st.cold, 'aria-label': '冷氣團強度', oninput: (e) => { st.cold = +e.target.value; st.t = 0; sync(); bump(); } });
  const wIn = h('input', { type: 'range', min: 1, max: 5, step: 1, value: st.warm, 'aria-label': '暖氣團強度', oninput: (e) => { st.warm = +e.target.value; st.t = 0; sync(); bump(); } });
  const playBtn = h('button', { type: 'button', class: 'btn btn-primary' }, '▶ 播放');

  function draw() {
    const k = kind(), diff = st.cold - st.warm;
    const base = 180, off = k === 'stat' ? Math.sin(st.t * 1.6) * 14 : Math.sign(diff) * Math.min(60, st.t * 18 * Math.abs(diff)), x = base + off; // 冷強：向右；暖強：向左
    const svg = s('svg', { viewBox: '0 0 360 220', role: 'img', 'aria-label': '氣團與鋒面示意圖（俯視）', class: 'sim-svg wide' });
    svg.append(s('rect', { width: 360, height: 220, fill: '#f6fbff' }), s('rect', { x: 0, y: 0, width: x, height: 220, fill: '#9cc7f2', opacity: 0.85 }), s('rect', { x, y: 0, width: 360 - x, height: 220, fill: '#ffb4a2', opacity: 0.85 }),
      s('text', { x: 20, y: 30, 'font-size': 15, 'font-weight': 700, fill: '#1f4f86', text: '冷氣團（寒冷、乾燥）' }), s('text', { x: 205, y: 30, 'font-size': 15, 'font-weight': 700, fill: '#9b3b25', text: '暖氣團（溫暖、潮溼）' }));
    svg.append(s('line', { x1: x, y1: 0, x2: x, y2: 220, stroke: '#3d2f3a', 'stroke-width': 3 }));
    for (let y = 20; y < 210; y += 36) {
      const kk = k === 'stat' ? (Math.round((y - 20) / 36) % 2 === 0 ? 'cold' : 'warm') : k;
      if (kk === 'cold') svg.append(s('path', { d: `M ${x} ${y - 9} L ${x} ${y + 9} L ${x + 13} ${y} Z`, fill: '#2f6fd6' })); // 藍色三角形：尖端朝冷氣團前進的方向（右）
      else svg.append(s('path', { d: `M ${x} ${y - 9} A 9 9 0 0 0 ${x} ${y + 9} Z`, fill: '#e5484d' })); // 紅色半圓形：凸起朝暖氣團前進的方向（左）
    }
    const mv = k === 'cold' ? '→ 冷氣團前進' : k === 'warm' ? '← 暖氣團前進' : '↔ 來回移動或停留';
    svg.append(s('text', { x: 180, y: 208, 'text-anchor': 'middle', 'font-size': 14, 'font-weight': 700, fill: '#3d2f3a', text: mv }));
    svgBox.textContent = ''; svgBox.append(svg);
  }
  function sync() {
    const k = kind(); draw();
    const R = ROWS[k];
    out.textContent = `冷氣團強度 ${st.cold}、暖氣團強度 ${st.warm} → ${R.name}。形成：${R.how}。天氣：${R.wx}。`;
    tbl.textContent = ''; tbl.append(h('tr', {}, ...['鋒面', '怎麼形成', '天氣'].map((x) => h('th', { text: x }))));
    Object.entries(ROWS).forEach(([id, r]) => tbl.append(h('tr', { class: id === k ? 'hl' : '' }, h('td', { text: r.name }), h('td', { text: r.how }), h('td', { text: r.wx }))));
    cIn.value = st.cold; wIn.value = st.warm;
  }
  function stop() { st.playing = false; cancelAnimationFrame(raf); playBtn.textContent = '▶ 播放'; }
  function tick(ts) { if (!st.playing) return; if (last) st.t += Math.min(0.1, (ts - last) / 1000); last = ts; if (st.t > 3 && kind() !== 'stat') st.t = 0; draw(); raf = requestAnimationFrame(tick); }
  playBtn.addEventListener('click', () => {
    if (st.playing) { stop(); return; }
    if (reducedMotion()) { st.t = st.t > 2 ? 0 : st.t + 1; draw(); bump(); return; }
    st.playing = true; last = 0; playBtn.textContent = '⏸ 暫停'; raf = requestAnimationFrame(tick); bump();
  });
  if (reducedMotion()) playBtn.textContent = '＋移動一步';
  const presets = h('div', { class: 'row' }, ...[['冬季：冷氣團較強', 4, 2], ['梅雨：勢力相當', 3, 3], ['暖氣團較強', 2, 4]].map(([n, c, w]) => h('button', { type: 'button', class: 'chip', onclick: () => { st.cold = c; st.warm = w; st.t = 0; sync(); bump(); } }, n)));
  const ext = h('details', { class: 'model-note' }, h('summary', { text: '延伸知識：冷鋒和暖鋒的雨有什麼不同（課本沒有寫，考試請以課本為準）' }),
    h('table', { class: 'tbl' }, h('tr', {}, h('th', { text: '' }), h('th', { text: '冷鋒' }), h('th', { text: '暖鋒' })),
      ...[['空氣抬升', '快速（像鏟子把暖空氣猛烈往上推）', '緩慢（暖空氣沿著冷空氣斜面慢慢爬升）'], ['主要雲系', '積雨雲', '層狀雲'], ['降雨範圍', '較窄', '較廣'], ['降雨時間', '較短', '較長'], ['雨勢', '較強，常有陣雨、雷雨', '較溫和，多為連續小雨']].map((r) => h('tr', {}, ...r.map((c) => h('td', { text: c }))))),
    h('p', { class: 'note', text: '口訣：冷鋒＝快、狠、短；暖鋒＝慢、廣、長。' }));
  const alt = h('details', { class: 'static-alt' }, h('summary', { text: '文字版說明' }), h('p', { text: '冷氣團強，迫使暖氣團後退，形成冷鋒；暖氣團強，迫使冷氣團後退，形成暖鋒；勢力相當，形成滯留鋒。臺灣冬季常受冷鋒影響；五、六月的梅雨是滯留鋒造成。' }));
  root.classList.add('sim');
  root.append(h('div', { class: 'sim-warn' }, '⚠ 這是俯視的示意圖：強度數字只是「相對的強弱」，不是真實氣象資料。'), svgBox,
    h('div', { class: 'ctrl-box' }, h('label', {}, '冷氣團強度 ', cIn), h('label', {}, '暖氣團強度 ', wIn), h('div', { class: 'row' }, playBtn), presets), out, tbl, ext, alt);
  sync();
  return { getState: () => ({ ...st }), actions: () => actions, destroy: stop };
}
