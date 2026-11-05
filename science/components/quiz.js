/* 闖關練習與單元測驗引擎
 * practice：每題立即回饋與解析。 test：作答中不顯示對錯，結束後才顯示成績、錯題、錯誤知識點與解析。
 * 題型：mc（選擇；是非題也用它）、fill（點選詞語填空）、order（依序排列）。 */
import { h, clear, shuffle } from './dom.js';

export const qType = (q) => q.type || 'mc';
export const answerText = (q) => (q.answerText != null ? q.answerText : q.opts[q.answer]);
export const pickedText = (q, p) => (qType(q) === 'fill' ? (p || []).join('、') : qType(q) === 'order' ? (p || []).join(' → ') : q.opts[p]);
/* 這題所有「不可在提示中說出口」的答案文字（給小幫手防洩漏用） */
export const answerStrings = (q) => (qType(q) === 'mc' ? [String(q.opts[q.answer])] : (q.answerList || []).map(String));

export function pickQuestions(all, { level, count, perLevel, total }) {
  if (perLevel) return shuffle(Object.entries(perLevel).flatMap(([lv, n]) => shuffle(all.filter((q) => q.level === +lv)).slice(0, n)));
  if (level) return shuffle(all.filter((q) => q.level === level)).slice(0, count);
  return shuffle(all).slice(0, total || count || all.length);
}

export function runQuiz(root, questions, { mode, title, onAnswer, onDone, onAsk, onState }) {
  clear(root);
  const results = []; let i = 0;
  const card = h('div', { class: 'qcard' });
  root.append(h('h3', { text: title }), card);

  function ask() {
    clear(card);
    const q = questions[i], type = qType(q);
    card.append(h('div', { class: 'qmeta' }, `第 ${i + 1} / ${questions.length} 題`, h('span', { class: 'lv lv' + q.level, text: ['', '基礎', '進階', '精熟'][q.level] })));
    const fb = h('div', { class: 'feedback', 'aria-live': 'polite' });
    const qs = { answered: false, picked: null };
    onState && onState({ question: q, answered: false, picked: null });
    const askBtn = onAsk && mode === 'practice' ? h('button', { type: 'button', class: 'btn tutor-ask', onclick: () => onAsk({ question: q, answered: qs.answered, picked: qs.picked }) }, '💬 問小幫手') : null;
    const nextBtn = h('button', { type: 'button', class: 'btn btn-primary', hidden: true }, i + 1 < questions.length ? '下一題 →' : (mode === 'test' ? '交卷，看成績' : '看結果'));
    nextBtn.addEventListener('click', () => { i++; i < questions.length ? ask() : finish(); });

    /* 作答完成（三種題型共用） */
    function submit(ok, picked) {
      qs.answered = true; qs.picked = picked; onState && onState({ question: q, answered: true, picked });
      results.push({ q, ok, picked }); onAnswer && onAnswer(q, ok);
      if (mode === 'practice') fb.append(h('p', { class: ok ? 'ok' : 'bad', text: ok ? '✔ 答對了！' : '✘ 再想一想。正確答案是「' + answerText(q) + '」。' }), h('p', { class: 'explain' }, h('b', { text: '解析：' }), q.explain));
      else fb.append(h('p', { class: 'note', text: '已作答。' }));
      nextBtn.hidden = false; nextBtn.focus();
    }

    card.append(h('p', { class: 'qtext', text: type === 'fill' ? q.q.split('{}').join('＿＿') : q.q }));
    if (q.table) { const t = h('table', { class: 'tbl' }, h('tr', {}, ...q.table.h.map((x) => h('th', { text: x })))); q.table.r.forEach((r) => t.append(h('tr', {}, ...r.map((c) => h('td', { text: c }))))); card.append(t); }

    if (type === 'mc') {
      const order = shuffle(q.opts.map((o, k) => ({ o, k })));
      const list = h('div', { class: 'opts', role: 'group', 'aria-label': '選項' });
      order.forEach((it, n) => {
        const b = h('button', { type: 'button', class: 'opt' }, h('span', { class: 'k', text: String.fromCharCode(65 + n) }), it.o);
        b.addEventListener('click', () => {
          const ok = it.k === q.answer;
          [...list.children].forEach((c, idx) => { c.disabled = true; if (mode === 'practice') { if (order[idx].k === q.answer) c.classList.add('right'); else if (idx === n) c.classList.add('wrong'); } else if (idx === n) c.classList.add('picked'); });
          submit(ok, it.k);
        });
        list.append(b);
      });
      card.append(list);
    } else if (type === 'fill') {
      const parts = q.q.split('{}'), need = parts.length - 1, slots = new Array(need).fill(null);
      const chips = shuffle(q.opts.map((o, k) => ({ o, k }))), line = h('p', { class: 'fillline' }), pool = h('div', { class: 'row' }); let locked = false;
      const draw = () => {
        clear(line); parts.forEach((p, k) => { line.append(p); if (k < need) line.append(h('button', { type: 'button', class: 'slot' + (slots[k] ? ' filled' : ''), disabled: locked, 'aria-label': '第 ' + (k + 1) + ' 個空格', onclick: () => { slots[k] = null; draw(); } }, slots[k] ? slots[k].o : '＿＿')); });
        clear(pool); chips.forEach((c) => pool.append(h('button', { type: 'button', class: 'chip', disabled: locked || slots.some((s) => s && s.k === c.k), onclick: () => { const e = slots.indexOf(null); if (e >= 0) { slots[e] = c; draw(); } } }, c.o)));
        ok.disabled = locked || slots.includes(null);
      };
      const ok = h('button', { type: 'button', class: 'btn btn-primary', disabled: true, onclick: () => {
        locked = true; const got = slots.map((s) => s.o); const want = q.answerList;
        const good = q.anyOrder ? JSON.stringify([...got].sort()) === JSON.stringify([...want].sort()) : JSON.stringify(got) === JSON.stringify(want);
        draw(); submit(good, got);
      } }, '確認答案');
      card.append(h('p', { class: 'note', text: '點下面的詞語填進空格；點空格可以取消。' }), line, pool, h('div', { class: 'row' }, ok)); draw();
    } else if (type === 'order') {
      const items = shuffle(q.opts.slice()), seq = []; let locked = false; const poolEl = h('div', { class: 'row' }), seqEl = h('ol', { class: 'orderlist' });
      const draw = () => {
        clear(poolEl); items.filter((x) => !seq.includes(x)).forEach((x) => poolEl.append(h('button', { type: 'button', class: 'chip', disabled: locked, onclick: () => { seq.push(x); draw(); } }, x)));
        clear(seqEl); seq.forEach((x) => seqEl.append(h('li', {}, h('button', { type: 'button', class: 'chip on', disabled: locked, onclick: () => { seq.splice(seq.indexOf(x), 1); draw(); } }, x))));
        ok.disabled = locked || seq.length !== items.length;
      };
      const ok = h('button', { type: 'button', class: 'btn btn-primary', disabled: true, onclick: () => { locked = true; const good = JSON.stringify(seq) === JSON.stringify(q.answerList); draw(); submit(good, seq.slice()); } }, '確認順序');
      card.append(h('p', { class: 'note', text: '依正確的順序，一個一個點選；點已選的可以退回。' }), seqEl, poolEl, h('div', { class: 'row' }, ok)); draw();
    }
    card.append(fb, ...(askBtn ? [askBtn] : []), nextBtn);
  }
  function finish() { onDone && onDone(results); }
  ask();
}
