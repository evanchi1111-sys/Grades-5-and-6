/* 小工具：安全建立 DOM（一律用 textContent，不拼接 HTML 字串） */
export function h(tag, attrs, ...kids) {
  const e = document.createElement(tag);
  for (const k in attrs || {}) {
    const v = attrs[k];
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'text') e.textContent = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat()) if (c != null && c !== false) e.append(c.nodeType ? c : document.createTextNode(String(c)));
  return e;
}
const NS = 'http://www.w3.org/2000/svg';
export function s(tag, attrs, ...kids) {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs || {}) { const v = attrs[k]; if (v == null || v === false) continue; if (k === 'text') e.textContent = v; else e.setAttribute(k, v); }
  for (const c of kids.flat()) if (c != null && c !== false) e.append(c.nodeType ? c : document.createTextNode(String(c)));
  return e;
}
export function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); return el; }

/* 只允許 <b>、<i>、<br> 的簡單格式（原教材卡片內含 <b> 強調） */
export function richText(str) {
  const frag = document.createDocumentFragment();
  const parts = String(str).split(/(<\/?(?:b|i)>|<br\s*\/?>)/gi);
  let cur = frag; const stack = [];
  for (const p of parts) {
    const m = /^<(\/?)(b|i|br)\s*\/?>$/i.exec(p);
    if (!m) { if (p) cur.append(document.createTextNode(p.replace(/<[^>]*>/g, ''))); continue; }
    const tag = m[2].toLowerCase();
    if (tag === 'br') { cur.append(document.createElement('br')); continue; }
    if (m[1]) { if (stack.length && stack[stack.length - 1].tag === tag) { stack.pop(); cur = stack.length ? stack[stack.length - 1].el : frag; } }
    else { const el = document.createElement(tag === 'b' ? 'strong' : 'em'); cur.append(el); stack.push({ tag, el }); cur = el; }
  }
  return frag;
}
export const shuffle = (a) => { const r = a.slice(); for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };
export const reducedMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
