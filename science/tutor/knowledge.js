/* 小幫手的知識來源：只用「這個單元」的教材資料（原教材節點、實驗說明、題目解析）。
 * 檢索方式：中文雙字詞重疊（不是語意理解），找不到就老實說找不到。 */
import { loadOriginal } from '../components/lesson.js';

const strip = (x) => String(x == null ? '' : x).replace(/<[^>]+>/g, '');
function cardText(c) {
  const parts = (c.li || []).map(strip);
  if (c.table) c.table.r.forEach((r) => parts.push(r.map(strip).filter(Boolean).join('：')));
  return parts;
}
const STOP = /[的是了嗎呢啊和與及或在有不就也都怎麼什為何請問可以會被把這那哪些如個]/; // 含這些字的雙字詞太常見，不用來比對
export function bigrams(s) {
  const t = strip(s).replace(/[\s，。、？！：；「」（）()\-—…·.,?!:;'"]/g, ''); const set = new Set();
  for (let i = 0; i < t.length - 1; i++) { const g = t.slice(i, i + 2); if (!STOP.test(g)) set.add(g); }
  if (t.length === 1 && !STOP.test(t)) set.add(t);
  return set;
}
const score = (qset, text) => { const t = bigrams(text); let n = 0; qset.forEach((g) => { if (t.has(g)) n++; }); return n; };

export async function buildIndex(unit) {
  const entries = []; let nodes = [];
  try { nodes = await loadOriginal(unit.source.page); } catch (e) { /* 讀不到原教材：只用資料檔 */ }
  unit.source.nodes.forEach((nid) => {
    const p = nodes.find((x) => x.id === nid); if (!p) return;
    (p.cards || []).forEach((c) => entries.push({ kind: 'lesson', node: nid, nodeName: p.name, title: c.h, lines: cardText(c), source: `原教材「${p.name}」・${c.h}` }));
    if (p.trap) entries.push({ kind: 'trap', node: nid, nodeName: p.name, title: '易錯提醒', lines: [strip(p.trap)], source: `原教材「${p.name}」・易錯提醒` });
  });
  unit.labs.forEach((l) => entries.push({ kind: 'lab', lab: l.id, node: l.node, title: l.title, lines: [l.principle, l.conclusion], source: `互動實驗「${l.title}」` }));
  return { unit, entries, nodes, nodeName: (id) => (nodes.find((x) => x.id === id) || {}).name || id };
}

export function search(index, query, { limit = 3, node, kinds } = {}) {
  const q = bigrams(query); if (!q.size) return [];
  return index.entries.filter((e) => (!node || e.node === node) && (!kinds || kinds.includes(e.kind)))
    .map((e) => ({ e, s: score(q, e.title + ' ' + e.lines.join(' ')) })).filter((x) => x.s >= Math.max(q.size <= 2 ? 1 : 2, Math.ceil(q.size * 0.5)))
    .sort((a, b) => b.s - a.s).slice(0, limit).map((x) => ({ ...x.e, score: x.s }));
}
/* 某個知識標籤對應的教材段落（用標籤名稱＋題目文字比對，限定在補救入口的節點） */
export function cardsForTag(index, tag, tags, extra = '', limit = 2) {
  const t = tags[tag]; if (!t) return [];
  const node = t.remedy.step === 'lesson' ? t.remedy.node : (index.unit.labs.find((l) => l.id === t.remedy.act) || {}).node;
  const q = bigrams(t.name + ' ' + extra);
  const cand = index.entries.filter((e) => e.kind === 'lesson' && (!node || e.node === node));
  const ranked = cand.map((e) => ({ e, s: score(q, e.title + ' ' + e.lines.join(' ')) })).sort((a, b) => b.s - a.s);
  return ranked.filter((x) => x.s > 0).slice(0, limit).map((x) => x.e).concat(ranked.every((x) => x.s === 0) ? cand.slice(0, 1) : []);
}
