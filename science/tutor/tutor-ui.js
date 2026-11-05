/* 小幫手介面：浮動按鈕＋側邊（手機為底部）面板 */
import { h, clear, shuffle } from '../components/dom.js';
import { TAGS } from '../data/tags.js';

export function createTutorPanel({ unit, service, onUse, navigate }) {
  const st = { ctx: null, level: 1, qid: null, locked: null, busy: false };
  const fab = h('button', { type: 'button', class: 'tutor-fab', 'aria-haspopup': 'dialog', onclick: () => open() }, '🧑‍🏫 小幫手');
  const list = h('div', { class: 'tutor-msgs', 'aria-live': 'polite' });
  const quick = h('div', { class: 'tutor-quick' });
  const input = h('input', { type: 'text', placeholder: '輸入想問的觀念，例如：影子', 'aria-label': '輸入想問的觀念', maxlength: 40 });
  const send = h('button', { type: 'button', class: 'btn' }, '問');
  const panel = h('aside', { class: 'tutor', role: 'dialog', 'aria-label': '小幫手', hidden: true },
    h('div', { class: 'tutor-head' }, h('b', { text: '🧑‍🏫 小幫手' }), h('button', { type: 'button', class: 'x', 'aria-label': '關閉小幫手', onclick: () => close() }, '✕')),
    h('p', { class: 'tutor-note' }, '我只根據這個單元的教材回答，不確定的我會直接說不確定。我是教材小幫手，不是連網的 AI。' + (unit.fromContentDb ? '教材已通過審核（' + (unit.version || '') + '）。' : '教材內容尚待人工審核。')),
    list, quick, h('div', { class: 'tutor-input' }, input, send));
  document.body.append(fab, panel);

  function bubble(who, ...kids) { const b = h('div', { class: 'msg ' + who }, ...kids); list.append(b); list.scrollTop = list.scrollHeight; return b; }
  function renderBlocks(res) {
    const box = h('div', { class: 'msg bot' });
    res.blocks.forEach((b) => {
      if (b.t === 'text') box.append(h('p', { text: b.text }));
      else if (b.t === 'note') box.append(h('p', { class: 'note', text: b.text }));
      else if (b.t === 'quote') box.append(h('blockquote', {}, b.title ? h('b', { text: b.title }) : null, ...b.text.split('\n').map((l) => h('p', { text: l })), h('cite', { text: '來源：' + b.source })));
      else if (b.t === 'link') box.append(h('a', { class: 'btn', href: b.href, onclick: (e) => { if (navigate) { e.preventDefault(); close(); navigate(b.href); } } }, b.label));
      else if (b.t === 'question') box.append(miniQuiz(b.q));
    });
    if (!res.grounded && res.sources.length === 0 && !res.blocks.some((b) => b.t === 'quote')) box.append(h('p', { class: 'note', text: '（這個回答沒有引用教材。）' }));
    list.append(box); list.scrollTop = list.scrollHeight;
  }
  function miniQuiz(q) {
    const wrap = h('div', { class: 'mini' }, h('p', { class: 'qtext', text: q.q })); const fb = h('div', { 'aria-live': 'polite' });
    shuffle(q.opts.map((o, k) => ({ o, k }))).forEach((it) => {
      const b = h('button', { type: 'button', class: 'opt' }, it.o);
      b.addEventListener('click', () => { const ok = it.k === q.answer; [...wrap.querySelectorAll('.opt')].forEach((x) => { x.disabled = true; }); b.classList.add(ok ? 'right' : 'wrong'); fb.append(h('p', { class: ok ? 'ok' : 'bad', text: ok ? '✔ 答對了！' : '✘ 正確答案是「' + q.opts[q.answer] + '」。' }), h('p', { class: 'explain', text: '解析：' + q.explain })); });
      wrap.append(b);
    });
    wrap.append(fb); return wrap;
  }

  async function ask(kind, label, extra = {}) {
    if (st.busy) return; st.busy = true; bubble('me', h('span', { text: label }));
    const c = st.ctx || {}; const req = { kind, question: c.question || null, answered: !!c.answered, picked: c.picked, ...extra };
    try { const res = await service.ask(req); renderBlocks(res); onUse && onUse(kind === 'hint' ? 'hint' : kind); }
    catch (e) { bubble('bot', h('p', { text: '小幫手剛剛出了一點問題，請再試一次。' })); }
    st.busy = false; drawQuick();
  }
  function drawQuick() {
    clear(quick); const c = st.ctx;
    if (st.locked) { quick.append(h('p', { class: 'note', text: st.locked })); return; }
    if (c && c.question) {
      quick.append(
        h('button', { type: 'button', class: 'chip', onclick: () => { const lv = Math.min(3, st.level); st.level = Math.min(3, st.level + 1); ask('hint', lv === 1 ? '給我提示' : '再多一點提示', { level: lv }); } }, st.level === 1 ? '💡 給我提示' : '💡 再多一點提示'),
        h('button', { type: 'button', class: 'chip', onclick: () => ask('explain', '為什麼答案是這個？') }, '為什麼答案是這個？'),
        h('button', { type: 'button', class: 'chip', onclick: () => ask('simple', '可以用簡單的方法解釋嗎？') }, '用簡單的方法解釋'),
        h('button', { type: 'button', class: 'chip', onclick: () => ask('similar', '再出一題類似的', { tag: c.question.tag }) }, '再出一題類似的'),
        h('button', { type: 'button', class: 'chip', onclick: () => ask('concept', '我不懂這個觀念', { tag: c.question.tag }) }, '我不懂這個觀念'));
    } else {
      const tags = [...new Set(unit.questions.map((q) => q.tag))];
      const sel = h('select', { 'aria-label': '選一個觀念' }, h('option', { value: '', text: '選一個我不懂的觀念…' }), ...tags.map((t) => h('option', { value: t, text: TAGS[t].name })));
      sel.addEventListener('change', () => { if (sel.value) { const t = sel.value; ask('concept', '我不懂「' + TAGS[t].name + '」', { tag: t }); sel.value = ''; } });
      quick.append(sel);
    }
  }
  function doSearch() { const t = input.value.trim(); if (!t) return; input.value = ''; ask('search', t, { text: t }); }
  send.addEventListener('click', doSearch); input.addEventListener('keydown', (e) => { if (e.key === 'Enter') doSearch(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !panel.hidden) close(); });

  function open(ctx) {
    if (st.locked && !ctx) { panel.hidden = false; clear(list); drawQuick(); return; }
    if (ctx !== undefined) { if (!ctx || !ctx.question || ctx.question.id !== st.qid) { st.level = 1; clear(list); } st.ctx = ctx || null; st.qid = ctx && ctx.question ? ctx.question.id : null; }
    panel.hidden = false; fab.hidden = true;
    if (!list.children.length) bubble('bot', h('p', { text: st.ctx && st.ctx.question ? '你好！這題需要什麼幫忙？我會先給提示，不會直接說答案。' : '你好！選一個你不懂的觀念，或輸入想問的關鍵字。' }));
    drawQuick(); input.focus();
  }
  function close() { panel.hidden = true; fab.hidden = st.locked ? false : false; fab.focus && fab.focus(); }
  function setContext(ctx) { st.ctx = ctx || null; if (ctx && ctx.question && ctx.question.id !== st.qid) { st.level = 1; st.qid = ctx.question.id; clear(list); } if (!panel.hidden) drawQuick(); }
  function lock(msg) { st.locked = msg; fab.disabled = true; fab.title = msg; fab.classList.add('off'); if (!panel.hidden) panel.hidden = true; fab.hidden = false; }
  function unlock() { st.locked = null; fab.disabled = false; fab.title = ''; fab.classList.remove('off'); }
  return { open, close, setContext, lock, unlock, el: panel, fab };
}
