/* 知識教室：直接讀取「原教材」節點內容（唯讀），不複製成第二份。
 * 讀取失敗時顯示說明與原教材連結，不會空白。 */
import { h, richText, clear } from './dom.js';

const cache = {};
export async function loadOriginal(page) {
  if (cache[page]) return cache[page];
  const res = await fetch('../' + page, { cache: 'no-cache' });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const t = await res.text();
  const a = t.indexOf('var L=['); const b = t.indexOf('\n];', a);
  if (a < 0 || b < 0) throw new Error('找不到教材資料');
  const L = new Function('return (' + t.slice(a + 6, b + 2) + ')')();
  return (cache[page] = L);
}

function renderCard(c) {
  const box = h('section', { class: 'lcard' }, h('h4', { text: c.h }));
  if (c.li && c.li.length) box.append(h('ul', {}, ...c.li.map((x) => h('li', {}, richText(x)))));
  if (c.table) {
    const t = h('table', { class: 'tbl' });
    t.append(h('tr', {}, ...c.table.h.map((x) => h('th', {}, richText(x)))));
    c.table.r.forEach((r) => t.append(h('tr', {}, ...r.map((x) => h('td', {}, richText(x))))));
    box.append(t);
  }
  return box;
}

/* mount: 教材區；onViewed(nodeId)：某節點被看過 */
export async function mountLesson(root, unit, opts = {}) {
  clear(root);
  const fallback = (msg) => root.append(h('div', { class: 'sim-warn' }, msg + ' 你仍可以直接開啟原教材：', h('a', { href: '../' + unit.source.page, text: '開啟原教材頁面' })));
  let L;
  try { L = await loadOriginal(unit.source.page); } catch (e) { fallback('暫時讀不到原教材內容（' + e.message + '）。'); return; }
  const nodes = unit.source.nodes.map((id) => L.find((p) => p.id === id)).filter(Boolean);
  if (!nodes.length) { fallback('找不到對應的教材節點。'); return; }
  const tabs = h('div', { class: 'seg-row', role: 'tablist' });
  const body = h('div', { class: 'lbody' });
  const btns = {};
  function show(id) {
    const p = nodes.find((n) => n.id === id) || nodes[0];
    Object.entries(btns).forEach(([k, b]) => { b.classList.toggle('on', k === p.id); b.setAttribute('aria-selected', k === p.id ? 'true' : 'false'); });
    clear(body);
    body.append(h('h3', { text: p.name }), h('p', { class: 'intro' }, richText(p.intro || '')));
    (p.cards || []).forEach((c) => body.append(renderCard(c)));
    if (p.trap) body.append(h('div', { class: 'trap' }, richText(p.trap)));
    body.append(h('p', { class: 'note' }, '內容來源：原教材「', unit.source.page, '」・', p.name, '。圖解與照片請看原教材：', h('a', { href: '../' + unit.source.page, text: '開啟原教材' })));
    opts.onViewed && opts.onViewed(p.id, nodes.map((n) => n.id));
  }
  nodes.forEach((p) => { const b = h('button', { type: 'button', class: 'seg', role: 'tab', onclick: () => show(p.id) }, p.name); btns[p.id] = b; tabs.append(b); });
  root.append(tabs, body);
  show(opts.node && nodes.some((n) => n.id === opts.node) ? opts.node : nodes[0].id);
}
