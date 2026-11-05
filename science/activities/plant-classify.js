/* 二分法分類（教材：五年級 植物單元 b4）
 * 第 0 步：選出明確的分類標準。 第 1～3 步：用一個標準把植物分成「是／不是」兩類，再細分。 */
import { h } from '../components/dom.js';

const STANDARDS = [['花開得美不美', false, '「美不美」每個人看法不同，標準不明確，不適合。'], ['生長在水中嗎？', true, '可以明確判斷是或不是，是好標準。'], ['我喜不喜歡？', false, '這是個人喜好，不是植物的特徵，不適合。']];
const STEPS = [
  { q: '生長在水中嗎？', from: ['布袋蓮', '蓮', '大萍', '樟樹', '甘藷', '蛇莓'], yes: ['布袋蓮', '蓮', '大萍'], no: ['樟樹', '甘藷', '蛇莓'] },
  { q: '會漂浮嗎？（水中的植物）', from: ['布袋蓮', '蓮', '大萍'], yes: ['布袋蓮', '大萍'], no: ['蓮'] },
  { q: '有木本莖嗎？（不在水中的植物）', from: ['樟樹', '甘藷', '蛇莓'], yes: ['樟樹'], no: ['甘藷', '蛇莓'] },
];

export function mount(root, opts = {}) {
  const st = { step: -1, picked: null, placed: {}, msg: '' };
  let actions = 0; const bump = () => { actions++; opts.onAction && opts.onAction(actions); };
  const body = h('div', {}); const out = h('div', { class: 'readout', 'aria-live': 'polite' });
  const trail = h('div', { class: 'ctrl-box' });

  function drawTrail() {
    trail.textContent = '';
    STEPS.forEach((S, i) => { if (i < st.step || (i === st.step && S.from.every((n) => st.placed[i + ':' + n]))) trail.append(h('div', {}, h('b', { text: S.q }), ' 是：', S.yes.join('、'), '　不是：', S.no.join('、'))); });
    if (!trail.children.length) trail.append(h('span', { class: 'note', text: '分類結果會顯示在這裡。' }));
  }
  function render() {
    body.textContent = '';
    if (st.step < 0) {
      body.append(h('p', { class: 'qtext', text: '第一步：哪一個是「明確的分類標準」？' }), h('div', { class: 'row' }, ...STANDARDS.map(([t, ok, why]) => h('button', { type: 'button', class: 'btn', onclick: () => { st.msg = (ok ? '✔ ' : '✘ ') + why; if (ok) { st.step = 0; } render(); bump(); } }, t))));
      out.textContent = st.msg || '分類標準要明確，用一個標準分成「符合」和「不符合」兩類。';
      drawTrail(); return;
    }
    if (st.step >= STEPS.length) { body.append(h('p', { class: 'ok', text: '三個步驟都完成了！二分法一次只用一個標準，每一類還可以再細分。' })); out.textContent = '分類完成。'; drawTrail(); return; }
    const S = STEPS[st.step]; const left = S.from.filter((n) => !st.placed[st.step + ':' + n]);
    body.append(h('p', { class: 'qtext', text: `第 ${st.step + 1} 個問題：${S.q}` }),
      h('div', { class: 'row' }, ...left.map((n) => h('button', { type: 'button', class: 'chip' + (st.picked === n ? ' on' : ''), onclick: () => { st.picked = n; render(); } }, n))),
      h('div', { class: 'row' }, h('button', { type: 'button', class: 'btn', disabled: !st.picked, onclick: () => place(true) }, '是'), h('button', { type: 'button', class: 'btn', disabled: !st.picked, onclick: () => place(false) }, '不是')));
    out.textContent = st.msg || '先點一種植物，再選「是」或「不是」。'; drawTrail();
  }
  function place(yes) {
    const S = STEPS[st.step], n = st.picked, ok = (S.yes.includes(n)) === yes;
    if (ok) { st.placed[st.step + ':' + n] = yes ? 'y' : 'n'; st.msg = `✔ ${n}${yes ? '' : '不'}是。`; st.picked = null; if (S.from.every((x) => st.placed[st.step + ':' + x])) { st.msg += '這一步分好了！'; st.step++; } }
    else st.msg = `✘ ${n}不是這樣分的，再想想看。`;
    render(); bump();
  }
  const alt = h('details', { class: 'static-alt' }, h('summary', { text: '文字版說明（課本例子）' }), h('ul', {}, h('li', { text: '先問「生長在水中嗎？」→ 是：布袋蓮、蓮、大萍；不是：樟樹、甘藷、蛇莓。' }), h('li', { text: '水中的再問「會漂浮嗎？」→ 會：布袋蓮、大萍；不會：蓮。' }), h('li', { text: '不在水中的再問「有木本莖嗎？」→ 有：樟樹；沒有：甘藷、蛇莓。' })));
  root.classList.add('sim');
  root.append(body, out, trail, alt);
  render();
  return { getState: () => ({ ...st }), actions: () => actions, destroy() {} };
}
