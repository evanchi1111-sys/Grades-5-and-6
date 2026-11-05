/* 小幫手服務介面（可替換）
 *
 * TutorService：ask(request) → Promise<response>
 *   request  = { kind: 'hint'|'explain'|'simple'|'similar'|'concept'|'search', question?, tag?, text?, level?, answered?, picked? }
 *   response = { blocks: [ { t:'text', text } | { t:'quote', text, source } | { t:'link', label, href } | { t:'question', q } | { t:'note', text } ], sources: [string], grounded: boolean }
 *
 * LocalTutor：預設實作。只根據教材資料，不連網、不用任何金鑰。
 * RemoteTutor：可選。把「已檢索好的教材段落」送到你自己的後端（金鑰只放在後端），並在前端再次檢查回應。
 *   未設定 endpoint 時完全不會連網。見 tutor/BACKEND.md。 */
import { TAGS } from '../data/tags.js';
import { search, cardsForTag } from './knowledge.js';

/* 未作答時，教材段落中和「正確答案」太接近的句子不顯示，避免提示直接洩漏答案。
 * 答案只有一個字時（例如「根」），無法安全地擷取句子，就只提示要讀哪一段。 */
function guard(cards, req) {
  const q = req.question; if (!q || req.answered) return { cards, hidden: false };
  const ans = String(q.opts[q.answer]); let hidden = false;
  const out = cards.map((c) => {
    if (ans.length < 2) { hidden = true; return { ...c, lines: [] }; }
    const lines = c.lines.filter((l) => !l.includes(ans)); if (lines.length !== c.lines.length) hidden = true; return { ...c, lines };
  });
  return { cards: out, hidden };
}
const quote = (e) => ({ t: 'quote', text: e.lines.join('\n'), source: e.source, title: e.title });
const tagLink = (unit, tag) => { const t = TAGS[tag]; const q = new URLSearchParams({ id: unit.id, step: t.remedy.step }); if (t.remedy.step === 'lab') q.set('act', t.remedy.act); else q.set('node', t.remedy.node); return 'unit.html?' + q; };
const remedyLabel = (unit, index, tag) => { const r = TAGS[tag].remedy; return r.step === 'lab' ? '回到互動實驗：' + unit.labs.find((l) => l.id === r.act).title : '重讀教材：「' + index.nodeName(r.node) + '」'; };

/* 未作答時，所有顯示出去的文字都再檢查一次：把正確答案的文字換成空格（標籤名稱、實驗名稱本身可能就是答案）。 */
function blank(res, req) {
  const q = req.question; if (!q || req.answered) return res;
  const ans = String(q.opts[q.answer]); if (ans.length < 2) return res;
  const f = (s) => (typeof s === 'string' ? s.split(ans).join('＿＿') : s);
  res.blocks = res.blocks.map((b) => ({ ...b, text: f(b.text), label: f(b.label), source: f(b.source), title: f(b.title) }));
  return res;
}

export class LocalTutor {
  constructor(unit, index) { this.unit = unit; this.index = index; this.asked = new Set(); }

  /* 檢索（RemoteTutor 也會用到）：回傳這次回答可以引用的教材段落 */
  retrieve(req) {
    const q = req.question; const tag = req.tag || (q && q.tag);
    if (req.kind === 'search') return search(this.index, req.text || '', { limit: 3 });
    return tag ? cardsForTag(this.index, tag, TAGS, q ? q.q : '', 2) : [];
  }

  async ask(req) { return blank(await this.answer(req), req); }

  async answer(req) {
    const { unit, index } = this; const q = req.question; const tag = req.tag || (q && q.tag);
    switch (req.kind) {
      case 'hint': {
        if (!q) return this.none('請先選一道題目，我才知道要提示什麼。');
        const level = req.level || 1; const T = TAGS[q.tag];
        if (level === 1) return { grounded: true, sources: [], blocks: [{ t: 'text', text: String(q.opts[q.answer]).length >= 2 && T.name.includes(String(q.opts[q.answer])) ? '這一題考的觀念，名稱和答案很接近，所以我先不說名稱。' : `這一題在考「${T.name}」。` }, { t: 'text', text: '先別急著看選項，想一想：題目問的是這個觀念的哪一部分？把題目重新讀一遍，圈出關鍵字。' }, { t: 'link', label: remedyLabel(unit, index, q.tag), href: tagLink(unit, q.tag) }, { t: 'note', text: '還需要更多提示，可以再按一次「再多一點提示」。' }] };
        if (level === 2) { const g = guard(this.retrieve(req), req); const cards = g.cards; const shown = cards.filter((c) => c.lines.length); return { grounded: cards.length > 0, sources: cards.map((c) => c.source), blocks: [{ t: 'text', text: shown.length ? '教材裡這一段可能有幫助，先自己讀讀看：' : '建議你回到教材讀這幾段：' }, ...shown.map(quote), ...cards.filter((c) => !c.lines.length).map((c) => ({ t: 'text', text: `• ${c.source}` })), ...(g.hidden ? [{ t: 'note', text: '有些句子和答案太接近，我先不顯示，請你自己到教材裡找。' }] : []), ...(cards.length ? [] : [{ t: 'note', text: '我沒有找到特別相關的教材段落，建議回到教材重讀。' }])] }; }
        return { grounded: true, sources: [], blocks: [{ t: 'text', text: '還是想不出來嗎？沒關係。你可以先選一個你覺得最有可能的答案，作答之後我再幫你看解析。' }, { t: 'note', text: '我不會直接告訴你答案，因為自己想出來才記得住。' }] };
      }
      case 'explain': {
        if (!q) return this.none('請先選一道題目。');
        if (!req.answered) return { grounded: true, sources: [], blocks: [{ t: 'text', text: '你還沒作答喔！先試著選一個答案，作答之後我再解釋為什麼。' }, { t: 'note', text: '想要提示的話，可以按「給我提示」。' }] };
        const blocks = [{ t: 'text', text: `正確答案是「${q.opts[q.answer]}」。` }];
        if (req.picked != null && req.picked !== q.answer) blocks.push({ t: 'text', text: `你選的是「${q.opts[req.picked]}」，和教材說的不一樣。` });
        blocks.push({ t: 'quote', text: q.explain, source: `題目解析・${q.source}`, title: '解析' });
        return { grounded: true, sources: [q.source], blocks };
      }
      case 'simple': {
        if (!q) return this.none('請先選一道題目。');
        if (!req.answered) return { grounded: true, sources: [], blocks: [{ t: 'text', text: '我先不把答案說出來。你可以先試著作答，作答後我再用簡單的方法解釋。' }] };
        const steps = q.explain.split(/[。；]/).map((x) => x.trim()).filter(Boolean);
        const cards = this.retrieve(req); const eg = cards.find((c) => /生活|例/.test(c.title + c.lines.join('')));
        return { grounded: true, sources: [q.source, ...(eg ? [eg.source] : [])], blocks: [{ t: 'text', text: '用簡單的方法分成幾步：' }, ...steps.map((s, i) => ({ t: 'text', text: `${i + 1}. ${s}。` })), ...(eg ? [{ t: 'text', text: '教材裡的生活例子：' }, quote(eg)] : []), { t: 'note', text: `答案是「${q.opts[q.answer]}」。` }] };
      }
      case 'similar': {
        const base = q || null; const t = tag; if (!t) return this.none('請先選一道題目或一個觀念。');
        const pool = unit.questions.filter((x) => x.tag === t && (!base || x.id !== base.id));
        const fresh = pool.filter((x) => !this.asked.has(x.id)); const pick = (fresh.length ? fresh : pool)[Math.floor(Math.random() * (fresh.length ? fresh.length : pool.length))];
        if (!pick) return { grounded: true, sources: [], blocks: [{ t: 'text', text: `「${TAGS[t].name}」這個觀念目前沒有其他題目了。` }, { t: 'link', label: '去闖關練習', href: `unit.html?id=${unit.id}&step=practice` }] };
        this.asked.add(pick.id);
        return { grounded: true, sources: [pick.source], blocks: [{ t: 'text', text: `再來一題「${TAGS[t].name}」：` }, { t: 'question', q: pick }, { t: 'note', text: '小幫手出的題目不會計入你的學習紀錄。' }] };
      }
      case 'concept': {
        if (!tag) return this.none('請先選一個觀念。');
        const g = guard(cardsForTag(index, tag, TAGS, '', 2), req); const cards = g.cards; const shown = cards.filter((c) => c.lines.length);
        return { grounded: cards.length > 0, sources: cards.map((c) => c.source), blocks: [{ t: 'text', text: `「${TAGS[tag].name}」可以這樣複習：` }, ...shown.map(quote), ...cards.filter((c) => !c.lines.length).map((c) => ({ t: 'text', text: `• 請讀：${c.source}` })), ...(g.hidden ? [{ t: 'note', text: '你正在作答這一題，有些句子和答案太接近，我先不顯示。作答後再問我就可以看到完整解釋。' }] : []), { t: 'link', label: remedyLabel(unit, index, tag), href: tagLink(unit, tag) }] };
      }
      case 'search': {
        const res = this.retrieve(req);
        if (!res.length) return this.none('我在這個單元的教材裡找不到相關的內容，所以不確定。請問問老師，或換個說法再問一次。', true);
        const g = guard(res, req); const shown = g.cards.filter((c) => c.lines.length);
        return { grounded: true, sources: res.map((r) => r.source), blocks: [{ t: 'text', text: '我在教材裡找到這些：' }, ...shown.map(quote), ...g.cards.filter((c) => !c.lines.length).map((c) => ({ t: 'text', text: `• 請讀：${c.source}` })), ...(g.hidden ? [{ t: 'note', text: '你正在作答，有些句子和答案太接近，我先不顯示。' }] : [])] };
      }
      default: return this.none('這個問題我還不會。');
    }
  }
  none(text, suggest) {
    const blocks = [{ t: 'text', text }];
    if (suggest) blocks.push({ t: 'note', text: '你可以試試這些觀念：' + [...new Set(this.unit.questions.map((x) => TAGS[x.tag].name))].slice(0, 6).join('、') });
    return { grounded: false, sources: [], blocks };
  }
}

/* 可選：把「已檢索的教材段落」送到你自己的後端。前端不放任何金鑰。 */
export class RemoteTutor {
  constructor(endpoint, local) { this.endpoint = endpoint; this.local = local; }
  async ask(req) {
    const context = this.local.retrieve(req).map((c) => ({ source: c.source, text: c.lines.join('\n') }));
    const q = req.question;
    // 送出的內容：問題種類、題目文字、教材段落。不含暱稱、不含學習紀錄；未作答時不含答案與解析。
    const payload = { kind: req.kind, text: req.text || null, question: q ? { q: q.q, opts: q.opts, ...(req.answered ? { answer: q.answer, explain: q.explain } : {}) } : null, answered: !!req.answered, level: req.level || null, context };
    try {
      const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), 12000);
      const res = await fetch(this.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: ctl.signal }); clearTimeout(to);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const j = await res.json();
      if (!Array.isArray(j.blocks) || !Array.isArray(j.sources) || !j.sources.length) throw new Error('回應沒有教材來源');
      const blocks = j.blocks.filter((b) => b && (b.t === 'text' || b.t === 'note') && typeof b.text === 'string').slice(0, 8);
      if (!blocks.length) throw new Error('回應格式不正確');
      if (q && !req.answered && blocks.some((b) => b.text.includes(String(q.opts[q.answer])) && String(q.opts[q.answer]).length >= 2)) throw new Error('回應直接公布了答案');
      return { grounded: true, sources: j.sources.map(String), blocks: [...blocks, { t: 'note', text: '這個回答由外部服務產生，內容以教材為準。' }] };
    } catch (e) {
      const r = await this.local.ask(req); r.blocks.push({ t: 'note', text: '外部服務暫時無法使用，已改用教材小幫手。' }); return r;
    }
  }
}

export function createTutor(unit, index, config = {}) {
  const local = new LocalTutor(unit, index);
  return config.endpoint && /^https:\/\//.test(config.endpoint) ? new RemoteTutor(config.endpoint, local) : local;
}
