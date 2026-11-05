/* 互動實驗室外框：預測 → 操作 → 觀察 → 原理 → 結論，並標示模型假設與限制 */
import { h, clear } from './dom.js';

export async function mountLab(root, lab, opts = {}) {
  clear(root);
  const mod = await import(`../activities/${lab.id}.js`);
  let predicted = null, ctl = null, count = 0, done = !!opts.alreadyDone;

  const head = h('div', { class: 'lab-head' },
    h('h3', { text: lab.title }),
    h('p', {}, h('b', { text: '實驗目的：' }), lab.objective),
    h('details', { class: 'lab-info', open: true }, h('summary', { text: '操作說明與實驗條件' }),
      h('ol', {}, ...lab.steps.map((x) => h('li', { text: x }))),
      h('p', {}, h('b', { text: '實驗條件：' })), h('ul', {}, ...lab.conditions.map((x) => h('li', { text: x })))));

  const predBox = h('div', { class: 'predict' }, h('h4', { text: '先猜猜看' }), h('p', { text: lab.predict.q }));
  const predOpts = h('div', { class: 'row' });
  const stage = h('div', { class: 'stage', hidden: true });
  const simEl = h('div', {});
  const need = lab.minActions;
  const progress = h('div', { class: 'note', 'aria-live': 'polite' });
  const finishBtn = h('button', { type: 'button', class: 'btn btn-primary', disabled: true }, '我觀察完了，看結論');
  const resultBox = h('div', { class: 'result-box', hidden: true });

  lab.predict.options.forEach((o, i) => {
    const b = h('button', { type: 'button', class: 'chip', onclick: () => {
      predicted = i; [...predOpts.children].forEach((c, k) => { c.classList.toggle('on', k === i); c.disabled = true; });
      predBox.append(h('p', { class: 'note', text: '已記下你的預測：「' + o + '」。現在開始操作模擬器，自己驗證！' }));
      stage.hidden = false; opts.onPredict && opts.onPredict(lab.id, i, i === lab.predict.answer);
      ctl = mod.mount(simEl, { onAction: (n) => { count = n; update(); } }); update();
    } }, o);
    predOpts.append(b);
  });
  predBox.append(predOpts);

  function update() {
    const left = Math.max(0, need - count);
    progress.textContent = done ? '你已經完成過這個實驗，可以再玩一次。' : (left > 0 ? `再操作 ${left} 次，就可以看結論。` : '可以看結論了！');
    finishBtn.disabled = !done && left > 0;
  }
  finishBtn.addEventListener('click', () => {
    clear(resultBox); resultBox.hidden = false;
    const ok = predicted === lab.predict.answer;
    resultBox.append(
      h('h4', { text: '實驗結論' }),
      h('p', { class: ok ? 'ok' : 'bad' }, (ok ? '✔ 你的預測正確！' : '✘ 預測和結果不一樣，沒關係，這就是學習。'), ' ', lab.predict.reveal),
      h('p', {}, h('b', { text: '科學原理：' }), lab.principle),
      h('p', {}, h('b', { text: '結論：' }), lab.conclusion),
      h('p', { class: 'sim-warn' }, '安全提醒：' + lab.safety));
    if (!done) { done = true; opts.onComplete && opts.onComplete(lab.id); }
    update();
  });

  const observe = h('div', { class: 'observe' }, h('h4', { text: '觀察重點' }), h('ul', {}, ...lab.observe.map((x) => h('li', { text: x }))));
  const model = h('details', { class: 'model-note' }, h('summary', { text: '模型假設與限制（重要）' }),
    h('p', {}, h('b', { text: '模型假設：' })), h('ul', {}, ...lab.model.assumptions.map((x) => h('li', { text: x }))),
    h('p', {}, h('b', { text: '限制：' })), h('ul', {}, ...lab.model.limits.map((x) => h('li', { text: x }))));
  stage.append(simEl, observe, progress, finishBtn);
  root.append(head, predBox, stage, resultBox, model);
  update();
  return { destroy() { ctl && ctl.destroy && ctl.destroy(); } };
}
