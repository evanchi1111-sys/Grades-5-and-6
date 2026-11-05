/* 太陽能板擺放實驗（教學模擬，不是真實發電量）
 * 相對受光量 = 一天中「陽光與板面垂直程度」的累加（餘弦關係），再除以同條件下最佳擺法，得到 0～100%。 */
import { h, s } from '../components/dom.js';
import { TERMS, DECL, sunPos, dayInfo, azName, rad } from './astro.js';

function vec(alt, az) { const a = rad(alt), z = rad(az); return [Math.cos(a) * Math.sin(z), Math.cos(a) * Math.cos(z), Math.sin(a)]; }
function dayLight(decl, tilt, face, shade) {
  const d = dayInfo(decl); let sum = 0;
  const n = [Math.sin(rad(tilt)) * Math.sin(rad(face)), Math.sin(rad(tilt)) * Math.cos(rad(face)), Math.cos(rad(tilt))];
  for (let t = d.rise; t <= d.set; t += 0.1) {
    const p = sunPos(decl, t); if (p.alt <= 0) continue;
    if (shade && p.az >= 210 && p.az <= 300 && p.alt < 35) continue; // 西邊高樓遮住低角度的下午陽光
    const v = vec(p.alt, p.az); const dot = n[0] * v[0] + n[1] * v[1] + n[2] * v[2]; if (dot > 0) sum += dot * 0.1;
  }
  return sum;
}
const SEASON = { all: ['spring', 'summer', 'autumn', 'winter'], spring: ['spring'], summer: ['summer'], winter: ['winter'] };
function light(season, tilt, face, shade) { const ids = SEASON[season]; return ids.reduce((a, id) => a + dayLight(DECL[id], tilt, face, shade), 0) / ids.length; }
const bestCache = {};
function best(season, shade) {
  const k = season + shade; if (bestCache[k]) return bestCache[k];
  let b = { v: 0 }; for (let t = 0; t <= 90; t += 5) for (let f = 0; f < 360; f += 15) { const v = light(season, t, f, shade); if (v > b.v) b = { v, tilt: t, face: f }; }
  return (bestCache[k] = b);
}

export function mount(root, opts = {}) {
  const st = { season: 'all', tilt: 0, face: 0, shade: false };
  let actions = 0; const bump = () => { actions++; opts.onAction && opts.onAction(actions); };
  const C = 100, R = 78;
  const compass = s('svg', { viewBox: '0 0 200 200', role: 'img', 'aria-label': '俯視圖：太陽能板面向的方位', class: 'sim-svg' });
  compass.append(s('circle', { cx: C, cy: C, r: R, fill: '#e9f7df', stroke: '#3d2f3a', 'stroke-width': 3 }));
  [['北', 0], ['東', 90], ['南', 180], ['西', 270]].forEach(([n, a]) => compass.append(s('text', { x: C + (R + 13) * Math.sin(rad(a)), y: C - (R + 13) * Math.cos(rad(a)) + 5, 'text-anchor': 'middle', 'font-size': 15, 'font-weight': 700, fill: '#4a3b45', text: n })));
  const arrow = s('g', {}, s('rect', { x: -22, y: -10, width: 44, height: 20, rx: 4, fill: '#4f6fd8', stroke: '#233', 'stroke-width': 2 }), s('path', { d: 'M -8 -22 L 0 -36 L 8 -22 Z', fill: '#f2b93b', stroke: '#233', 'stroke-width': 2 }));
  const bld = s('rect', { x: 8, y: 70, width: 28, height: 60, fill: '#b4aea2', stroke: '#3d2f3a', 'stroke-width': 2 });
  compass.append(bld, arrow);
  const tiltSvg = s('svg', { viewBox: '0 0 200 140', role: 'img', 'aria-label': '側視圖：太陽能板的傾斜角', class: 'sim-svg' });
  tiltSvg.append(s('rect', { x: 0, y: 0, width: 200, height: 140, fill: '#dff1fb' }), s('rect', { x: 0, y: 110, width: 200, height: 30, fill: '#b9e3a4' }), s('line', { x1: 0, y1: 110, x2: 200, y2: 110, stroke: '#3d2f3a', 'stroke-width': 3 }));
  const panel = s('g', {}, s('rect', { x: -45, y: -5, width: 90, height: 10, rx: 3, fill: '#4f6fd8', stroke: '#233', 'stroke-width': 2 }));
  const tiltTxt = s('text', { x: 100, y: 132, 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 700, fill: '#3d5a2a' });
  tiltSvg.append(s('rect', { x: 70, y: 100, width: 60, height: 10, fill: '#8a5a44' }), panel, tiltTxt);

  const bar = h('div', { class: 'meter' }, h('div', { class: 'meter-fill' }));
  const pct = h('div', { class: 'meter-pct' });
  const verdict = h('div', { class: 'readout', 'aria-live': 'polite' });
  const seasonSel = h('select', { 'aria-label': '季節' }, ...[['all', '全年（四個節氣平均）'], ['summer', '夏至'], ['spring', '春分、秋分'], ['winter', '冬至']].map(([v, n]) => h('option', { value: v, text: n })));
  const tiltIn = h('input', { type: 'range', min: 0, max: 90, step: 5, value: 0, 'aria-label': '傾斜角（度）' });
  const faceIn = h('input', { type: 'range', min: 0, max: 345, step: 15, value: 0, 'aria-label': '面向的方位（度，北為0）' });
  const shadeIn = h('input', { type: 'checkbox' });
  const hint = h('div', { class: 'note' });

  function sync() {
    const v = light(st.season, st.tilt, st.face, st.shade), b = best(st.season, st.shade), rel = Math.max(0, Math.round((v / b.v) * 100));
    arrow.setAttribute('transform', `translate(${C},${C}) rotate(${st.face})`);
    bld.setAttribute('display', st.shade ? 'block' : 'none');
    panel.setAttribute('transform', `translate(100,100) rotate(${-st.tilt * 0})`); // 側視圖：板面固定朝右，旋轉角 = 傾斜角
    panel.setAttribute('transform', `translate(100,98) rotate(${-st.tilt})`);
    tiltTxt.textContent = '傾斜角 ' + st.tilt + '°';
    bar.firstChild.style.width = rel + '%'; bar.firstChild.style.background = rel >= 85 ? '#6cc56a' : rel >= 60 ? '#f2b93b' : '#ff8a80';
    pct.textContent = '相對受光量：' + rel + '%（教學模擬）';
    verdict.textContent = `板面朝${azName(st.face)}、傾斜 ${st.tilt}°，${st.shade ? '西邊有高樓遮擋，' : ''}一天接收的陽光約為最佳擺法的 ${rel}%。` + (rel >= 85 ? '很不錯！' : rel >= 60 ? '還可以，再試試調整方位或角度。' : '比較差，換個方位或角度試試。');
    hint.textContent = `（模擬中這個條件的最佳擺法約是朝${azName(b.face)}、傾斜 ${b.tilt}° 左右；課本只要求「朝南、適當傾斜、避免遮蔽」。）`;
  }
  seasonSel.addEventListener('change', () => { st.season = seasonSel.value; sync(); bump(); });
  tiltIn.addEventListener('input', () => { st.tilt = +tiltIn.value; sync(); bump(); });
  faceIn.addEventListener('input', () => { st.face = +faceIn.value; sync(); bump(); });
  shadeIn.addEventListener('change', () => { st.shade = shadeIn.checked; sync(); bump(); });

  const notice = h('div', { class: 'sim-warn', role: 'note' }, '⚠ 這是教學模擬：用簡化的陽光幾何算出「相對受光量」，不是真實發電量，也不是任何實測數據。');
  const alt = h('details', { class: 'static-alt' }, h('summary', { text: '看不到動畫？文字版說明' }),
    h('p', { text: '課本重點：在臺灣安裝太陽能板要朝南、適當傾斜、周圍避免有高物遮住陽光。太陽能光電板把光能變成電能。模擬結果通常是朝南時受光量最高、朝北時最低。' }));

  root.classList.add('sim');
  root.append(notice, h('div', { class: 'sim-views' }, compass, tiltSvg),
    h('div', { class: 'ctrl-box' },
      h('label', {}, '季節 ', seasonSel),
      h('label', {}, '面向的方位 ', faceIn),
      h('label', {}, '傾斜角 ', tiltIn),
      h('label', { class: 'chk' }, shadeIn, ' 西邊有高樓（下午被擋住）')),
    h('div', { class: 'meter-wrap' }, bar, pct), verdict, hint, alt);
  sync();
  return { getState: () => ({ ...st }), actions: () => actions, destroy() {} };
}
