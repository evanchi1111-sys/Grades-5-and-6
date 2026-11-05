/* 不同環境的植物適應（教材：五年級 植物單元 b1）
 * 探索：選環境、點植物看特別的構造。 挑戰：看到一個構造，猜是哪一種植物。 */
import { h } from '../components/dom.js';

const ENV = {
  campus: { name: '校園', challenge: '（校園裡也有各種特別的植物）', plants: [
    ['榕樹', '氣生根：吸收空氣中的水分，也能形成支柱'], ['鳳凰木', '板根：固定植物體，也增加根部呼吸面積'],
    ['大萍', '葉有細毛、葉片有通氣組織，讓它漂在水面'], ['布袋蓮', '膨大的葉柄有通氣組織，儲存空氣漂浮'], ['樟樹', '木本莖支持植物體']] },
  sea: { name: '海邊', challenge: '缺水、強風、高鹽', plants: [
    ['海茄苳', '葉面硬挺像皮革，防水分散失；長出呼吸根，獲取氧氣'], ['濱水菜', '葉面有蠟質；肉質葉儲水、耐鹽'], ['木麻黃', '葉子極小，減少水分散失；板根抵抗強風']] },
  mountain: { name: '高山', challenge: '強風、低溫、日晒強', plants: [
    ['玉山杜鵑', '葉面有蠟質；植株矮小、莖緊貼地面'], ['玉山薄雪草', '葉面有絨毛；全株絨毛抗低溫和強日晒'], ['玉山圓柏', '針狀葉防水分散失；莖彎曲生長適應強風']] },
};

export function mount(root, opts = {}) {
  const st = { env: 'sea', plant: null, mode: 'explore', q: null, score: 0, asked: 0, msg: '' };
  let actions = 0; const bump = () => { actions++; opts.onAction && opts.onAction(actions); };
  const body = h('div', {}); const out = h('div', { class: 'readout', 'aria-live': 'polite' });
  const envBtns = Object.entries(ENV).map(([k, e]) => h('button', { type: 'button', class: 'seg', onclick: () => { st.env = k; st.plant = null; st.q = null; render(); bump(); } }, e.name));
  const modeBtns = [['explore', '探索'], ['quiz', '猜猜是誰']].map(([m, n]) => h('button', { type: 'button', class: 'seg', onclick: () => { st.mode = m; st.q = null; st.msg = ''; render(); bump(); } }, n));

  function render() {
    envBtns.forEach((b, i) => b.classList.toggle('on', Object.keys(ENV)[i] === st.env));
    modeBtns.forEach((b, i) => b.classList.toggle('on', ['explore', 'quiz'][i] === st.mode));
    const E = ENV[st.env]; body.textContent = '';
    body.append(h('p', { class: 'note', text: `${E.name}的環境：${E.challenge}` }));
    if (st.mode === 'explore') {
      body.append(h('div', { class: 'row' }, ...E.plants.map(([n]) => h('button', { type: 'button', class: 'chip' + (st.plant === n ? ' on' : ''), onclick: () => { st.plant = n; render(); bump(); } }, n))));
      const p = E.plants.find(([n]) => n === st.plant);
      out.textContent = p ? `${p[0]}：${p[1]}。` : '點一種植物，看它有什麼特別的構造。';
    } else {
      if (!st.q) { const i = Math.floor(Math.random() * E.plants.length); st.q = { i, picked: false }; }
      const target = E.plants[st.q.i];
      body.append(h('div', { class: 'qcard' }, h('p', { class: 'qtext', text: '哪一種植物有這個特別的構造？' }), h('p', { text: '「' + target[1] + '」' }),
        h('div', { class: 'row' }, ...E.plants.map(([n]) => h('button', { type: 'button', class: 'chip', disabled: st.q.picked, onclick: () => answer(n === target[0], target) }, n)))));
      out.textContent = (st.msg || '選選看！') + `（答對 ${st.score} / ${st.asked}）`;
      if (st.q.picked) body.append(h('button', { type: 'button', class: 'btn', onclick: () => { st.q = null; render(); } }, '下一題'));
    }
  }
  function answer(ok, t) { st.q.picked = true; st.asked++; if (ok) st.score++; st.msg = ok ? `✔ 答對了！${t[0]}：${t[1]}。` : `✘ 不是喔，正確答案是${t[0]}。`; render(); bump(); }
  const alt = h('details', { class: 'static-alt' }, h('summary', { text: '文字版說明（課本整理）' }), h('table', { class: 'tbl' }, h('tr', {}, h('th', { text: '環境' }), h('th', { text: '植物與特別的構造' })),
    ...Object.values(ENV).map((e) => h('tr', {}, h('td', { text: e.name + '（' + e.challenge + '）' }), h('td', { text: e.plants.map(([n, f]) => n + '：' + f).join('；') })))),
    h('p', { class: 'note', text: '易錯：呼吸根是海茄苳，板根是鳳凰木和木麻黃，氣生根是榕樹。' }));
  root.classList.add('sim');
  root.append(h('div', { class: 'seg-row' }, ...envBtns), h('div', { class: 'seg-row' }, ...modeBtns), body, out, alt);
  render();
  return { getState: () => ({ ...st }), actions: () => actions, destroy() {} };
}
