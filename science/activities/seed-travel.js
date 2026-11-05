/* 種子傳播配對／繁殖方式比較（教材：五年級 植物單元 b3）
 * 配對：先點一種植物，再點它的傳播方式。 繁殖：點植物或部位，看可以用哪些方式繁殖。 */
import { h } from '../components/dom.js';

const WAYS = { animal: '動物', spring: '自身彈力', wind: '風力', water: '水力' };
const FEATURE = { animal: '果實多肉多汁，或有倒勾刺', spring: '果實成熟後迸開，把種子彈出去', wind: '果實或種子有絨毛或薄翅', water: '果實具浮水性' };
const SEEDS = [['榕樹', 'animal'], ['大花咸豐草', 'animal'], ['非洲鳳仙花', 'spring'], ['黃花酢漿草', 'spring'], ['蒲公英', 'wind'], ['木棉', 'wind'], ['青楓', 'wind'], ['椰子樹', 'water'], ['棋盤腳', 'water']];
const REPRO = [['甘藷', ['種子', '莖', '塊根（根）']], ['萬年青', ['莖']], ['落地生根', ['葉']], ['石蓮', ['葉']], ['蕨類', ['孢子（不開花）']]];

export function mount(root, opts = {}) {
  const st = { mode: 'match', picked: null, placed: {}, tries: 0, plant: null, part: null };
  let actions = 0; const bump = () => { actions++; opts.onAction && opts.onAction(actions); };
  const body = h('div', {}); const out = h('div', { class: 'readout', 'aria-live': 'polite' });
  const tabs = [['match', '種子傳播配對'], ['repro', '繁殖方式比較']].map(([m, n]) => h('button', { type: 'button', class: 'seg', onclick: () => { st.mode = m; render(); bump(); } }, n));

  function render() {
    tabs.forEach((b, i) => b.classList.toggle('on', ['match', 'repro'][i] === st.mode));
    body.textContent = '';
    if (st.mode === 'match') {
      const left = SEEDS.filter(([n]) => !st.placed[n]);
      body.append(h('p', { class: 'note', text: '先點一種植物，再點它的種子傳播方式。' }),
        h('div', { class: 'row' }, ...left.map(([n]) => h('button', { type: 'button', class: 'chip' + (st.picked === n ? ' on' : ''), onclick: () => { st.picked = n; render(); } }, n))),
        h('div', { class: 'row' }, ...Object.entries(WAYS).map(([k, w]) => h('button', { type: 'button', class: 'btn', disabled: !st.picked, onclick: () => choose(k) }, w))),
        h('div', { class: 'ctrl-box' }, ...Object.entries(WAYS).map(([k, w]) => h('div', {}, h('b', { text: w + '：' }), (SEEDS.filter(([n]) => st.placed[n] === k).map(([n]) => n).join('、') || '（還沒有）'), h('div', { class: 'note', text: '果實特徵：' + FEATURE[k] })))));
      out.textContent = left.length ? (st.msg || '加油！') : '全部配對完成！不同植物用不同方法把種子送到遠方。';
    } else {
      const parts = ['種子', '莖', '塊根（根）', '葉', '孢子（不開花）'];
      body.append(h('p', { class: 'note', text: '點一種植物，看它可以怎麼繁殖；或點一個部位，看哪些植物會用它。' }),
        h('div', { class: 'row' }, ...REPRO.map(([n]) => h('button', { type: 'button', class: 'chip' + (st.plant === n ? ' on' : ''), onclick: () => { st.plant = n; st.part = null; render(); bump(); } }, n))),
        h('div', { class: 'row' }, ...parts.map((p) => h('button', { type: 'button', class: 'seg' + (st.part === p ? ' on' : ''), onclick: () => { st.part = p; st.plant = null; render(); bump(); } }, p))));
      let t = '同一種植物可以有多種繁殖方式，通常會依環境選對自己有利的。';
      if (st.plant) { const r = REPRO.find(([n]) => n === st.plant)[1]; t = `${st.plant}：可以用 ${r.join('、')} 繁殖。` + (r.length > 1 ? '同一種植物有多種繁殖方式。' : '') + (st.plant === '蕨類' ? '蕨類不開花，用孢子繁殖。' : '根、莖、葉儲存很多養分，供新芽初期生長。'); }
      if (st.part) { const names = REPRO.filter(([, r]) => r.some((x) => x.startsWith(st.part.slice(0, 2)))).map(([n]) => n); t = `用「${st.part}」繁殖的植物：${names.join('、') || '（這裡沒有）'}。`; }
      out.textContent = t;
    }
  }
  function choose(k) {
    const n = st.picked; st.tries++;
    if (SEEDS.find(([x]) => x === n)[1] === k) { st.placed[n] = k; st.msg = `✔ ${n}靠${WAYS[k]}傳播：${FEATURE[k]}。`; st.picked = null; }
    else st.msg = `✘ ${n}不是靠${WAYS[k]}傳播，再想想看。`;
    render(); bump();
  }
  const alt = h('details', { class: 'static-alt' }, h('summary', { text: '文字版說明（課本表格）' }), h('table', { class: 'tbl' }, h('tr', {}, ...['傳播方式', '果實特徵', '例子'].map((x) => h('th', { text: x }))),
    ...[['動物', '多肉多汁或有倒勾刺', '榕樹、大花咸豐草'], ['自身彈力', '成熟後迸開彈出種子', '非洲鳳仙花、黃花酢漿草'], ['風力', '有絨毛或薄翅', '蒲公英、木棉、青楓'], ['水力', '具浮水性', '椰子樹、棋盤腳']].map((r) => h('tr', {}, ...r.map((c) => h('td', { text: c }))))),
    h('p', { class: 'note', text: '繁殖：根—甘藷；莖—萬年青、甘藷；葉—落地生根、石蓮；蕨類不開花，用孢子繁殖。' }));
  root.classList.add('sim');
  root.append(h('div', { class: 'seg-row' }, ...tabs), body, out, alt);
  render();
  return { getState: () => ({ ...st }), actions: () => actions, destroy() {} };
}
