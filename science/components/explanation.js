/* 老師示範：一步一步的解說，可嵌入唯讀的模擬器 */
import { h, clear } from './dom.js';

export async function mountDemo(root, unit, opts = {}) {
  clear(root);
  let idx = 0, sim = null;
  const view = h('div', { class: 'demo-view' });
  const nav = h('div', { class: 'row' });
  const prev = h('button', { type: 'button', class: 'btn', onclick: () => go(idx - 1) }, '← 上一步');
  const next = h('button', { type: 'button', class: 'btn btn-primary', onclick: () => go(idx + 1) }, '下一步 →');
  const dots = h('div', { class: 'dots', role: 'group', 'aria-label': '示範步驟' });
  unit.demo.forEach((_, i) => dots.append(h('button', { type: 'button', class: 'dot', 'aria-label': '第 ' + (i + 1) + ' 步', onclick: () => go(i) }, String(i + 1))));
  nav.append(prev, dots, next);
  root.append(view, nav);

  async function go(i) {
    idx = Math.max(0, Math.min(unit.demo.length - 1, i));
    const d = unit.demo[idx];
    if (sim && sim.destroy) sim.destroy(); sim = null; clear(view);
    [...dots.children].forEach((b, k) => b.classList.toggle('on', k === idx));
    prev.disabled = idx === 0; next.disabled = idx === unit.demo.length - 1;
    view.append(h('span', { class: 'tag-kind', text: d.kind }), h('h3', { text: d.title }), h('p', { class: 'problem' }, h('b', { text: '題目：' }), d.problem),
      h('ol', { class: 'steps' }, ...d.steps.map((x) => h('li', { text: x }))));
    if (d.demo) {
      const holder = h('div', { class: 'demo-sim' }); view.append(holder);
      try { const mod = await import(`../activities/${d.demo.act}.js`); sim = mod.mount(holder, { readonly: true, preset: d.demo }); } catch (e) { holder.append(h('p', { class: 'note', text: '示意圖暫時無法顯示。' })); }
    }
    view.append(h('p', { class: 'note', text: '來源：' + d.source + '（' + d.status + '）' }));
    if (idx === unit.demo.length - 1) opts.onFinished && opts.onFinished();
  }
  await go(0);
}
