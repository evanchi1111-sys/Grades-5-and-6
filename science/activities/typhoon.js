/* 颱風強度與防災（教材：六年級 天氣單元 b4）
 * 強度：拉動近中心最大風速，看屬於哪一級（分級數值取自課本）。 防災：把行動分到「颱風前／侵襲時／過後」。 */
import { h, s } from '../components/dom.js';

function level(v) { return v >= 51 ? ['強烈颱風', '≧ 51.0'] : v >= 32.7 ? ['中度颱風', '32.7 ～ 50.9'] : v >= 17.2 ? ['輕度颱風', '17.2 ～ 32.6'] : ['熱帶性低氣壓（未達颱風）', '≦ 17.1']; }
const PERIODS = { before: '颱風前', during: '颱風侵襲時', after: '颱風過後' };
const ACTIONS = [
  ['準備防颱民生用品和緊急避難包', 'before'], ['清理水溝渠道', 'before'], ['放沙包或安裝防水閘門', 'before'], ['取下或固定戶外懸掛物', 'before'], ['檢查門窗、修剪路樹', 'before'],
  ['勿進入山區或靠近海域', 'during'], ['勿到海邊觀浪、釣魚', 'during'], ['注意颱風動向，必要時配合政府指示撤離', 'during'],
  ['外出注意掉落物', 'after'], ['整理環境、清除汙物與積水，避免傳染病流行', 'after'], ['災害損失通知里鄰長、警察派出所或鄉鎮公所', 'after'],
];

export function mount(root, opts = {}) {
  const st = { mode: 'level', wind: 20, picked: null, placed: {}, msg: '' };
  let actions = 0; const bump = () => { actions++; opts.onAction && opts.onAction(actions); };
  const body = h('div', {}); const out = h('div', { class: 'readout', 'aria-live': 'polite' });
  const tabs = [['level', '颱風的強度'], ['prep', '防颱準備']].map(([m, n]) => h('button', { type: 'button', class: 'seg', onclick: () => { st.mode = m; render(); bump(); } }, n));

  function ty(v) {
    const svg = s('svg', { viewBox: '0 0 360 230', role: 'img', 'aria-label': '颱風雲系示意', class: 'sim-svg wide' });
    svg.append(s('rect', { width: 360, height: 230, fill: '#4f8fd8' }));
    const k = Math.min(1, v / 60), r = 20 + 70 * k, arms = 3;
    if (v >= 17.2) { for (let a = 0; a < arms; a++) { const ang = (a * 2 * Math.PI) / arms; svg.append(s('path', { d: `M 180 115 q ${r * 0.9 * Math.cos(ang)} ${r * 0.9 * Math.sin(ang)} ${r * Math.cos(ang + 1.3)} ${r * Math.sin(ang + 1.3)}`, fill: 'none', stroke: '#fff', 'stroke-width': 10 + 18 * k, 'stroke-linecap': 'round', opacity: 0.9 })); } svg.append(s('circle', { cx: 180, cy: 115, r: r * 0.55, fill: '#fff', opacity: 0.95 }), s('circle', { cx: 180, cy: 115, r: 5 + 6 * k, fill: '#4f8fd8' })); }
    else svg.append(s('ellipse', { cx: 180, cy: 115, rx: 30 + v * 2, ry: 22 + v, fill: '#fff', opacity: 0.8 }));
    svg.append(s('text', { x: 10, y: 20, 'font-size': 12, fill: '#fff', 'font-weight': 700, text: '示意圖：雲系大小與風速的關係只是示意' }));
    return svg;
  }
  function render() {
    tabs.forEach((b, i) => b.classList.toggle('on', ['level', 'prep'][i] === st.mode));
    body.textContent = '';
    if (st.mode === 'level') {
      const [name, range] = level(st.wind);
      body.append(ty(st.wind), h('div', { class: 'ctrl-box' }, h('label', {}, '近中心最大風速 ', h('b', { text: st.wind + ' 公尺／秒' }), h('input', { type: 'range', min: 0, max: 70, step: 1, value: st.wind, 'aria-label': '近中心最大風速（公尺／秒）', oninput: (e) => { st.wind = +e.target.value; render(); bump(); } }))),
        h('table', { class: 'tbl' }, h('tr', {}, h('th', { text: '強度' }), h('th', { text: '近中心最大風速（公尺／秒）' })), ...[['熱帶性低氣壓（未達颱風）', '≦ 17.1'], ['輕度颱風', '17.2 ～ 32.6'], ['中度颱風', '32.7 ～ 50.9'], ['強烈颱風', '≧ 51.0']].map((r) => h('tr', { class: r[0] === name ? 'hl' : '' }, ...r.map((c) => h('td', { text: c }))))));
      out.textContent = `風速 ${st.wind} 公尺／秒 → ${name}（${range}）。颱風通常從熱帶性低氣壓發展而成，吸收海洋水氣後強度愈來愈強；每年 7～9 月最容易形成。`;
    } else {
      const left = ACTIONS.filter(([a]) => !st.placed[a]);
      body.append(h('p', { class: 'note', text: '先點一個行動，再選它應該在什麼時候做。' }),
        h('div', { class: 'row' }, ...left.map(([a]) => h('button', { type: 'button', class: 'chip' + (st.picked === a ? ' on' : ''), onclick: () => { st.picked = a; render(); } }, a))),
        h('div', { class: 'row' }, ...Object.entries(PERIODS).map(([k, n]) => h('button', { type: 'button', class: 'btn', disabled: !st.picked, onclick: () => place(k) }, n))),
        h('div', { class: 'ctrl-box' }, ...Object.entries(PERIODS).map(([k, n]) => h('div', {}, h('b', { text: n + '：' }), ACTIONS.filter(([a]) => st.placed[a] === k).map(([a]) => a).join('；') || '（還沒有）'))));
      out.textContent = left.length ? (st.msg || '想一想：颱風還沒來、正在侵襲、離開之後，各要做什麼？') : '全部分好了！掌握颱風消息可以看中央氣象署、新聞、廣播、氣象 APP，或撥打 166、167。颱風侵襲時不可以到海邊觀浪。';
    }
  }
  function place(k) { const a = st.picked; if (ACTIONS.find(([x]) => x === a)[1] === k) { st.placed[a] = k; st.msg = `✔ 「${a}」是${PERIODS[k]}要做的。`; st.picked = null; } else st.msg = `✘ 「${a}」不是${PERIODS[k]}做的，再想想看。`; render(); bump(); }
  const alt = h('details', { class: 'static-alt' }, h('summary', { text: '文字版說明（課本整理）' }), h('table', { class: 'tbl' }, h('tr', {}, h('th', { text: '時間' }), h('th', { text: '該做什麼' })),
    ...Object.entries(PERIODS).map(([k, n]) => h('tr', {}, h('td', { text: n }), h('td', { text: ACTIONS.filter(([, p]) => p === k).map(([a]) => a).join('；') })))));
  root.classList.add('sim');
  root.append(h('div', { class: 'sim-warn' }, '⚠ 這是教學示意：不是真實的颱風資料。真正遇到颱風，請依中央氣象署與政府公布的消息行動。'), h('div', { class: 'seg-row' }, ...tabs), body, out, alt);
  render();
  return { getState: () => ({ ...st }), actions: () => actions, destroy() {} };
}
