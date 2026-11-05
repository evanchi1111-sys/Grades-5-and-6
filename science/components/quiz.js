/* 闖關練習與單元測驗引擎
 * practice：每題立即回饋與解析。 test：作答中不顯示對錯，結束後才顯示成績、錯題、錯誤知識點與解析。 */
import { h, clear, shuffle } from './dom.js';

export function pickQuestions(all, { level, count, perLevel }) {
  if (perLevel) return shuffle(Object.entries(perLevel).flatMap(([lv, n]) => shuffle(all.filter((q) => q.level === +lv)).slice(0, n)));
  return shuffle(all.filter((q) => q.level === level)).slice(0, count);
}

export function runQuiz(root, questions, { mode, title, onAnswer, onDone }) {
  clear(root);
  const results = []; let i = 0;
  const card = h('div', { class: 'qcard' });
  root.append(h('h3', { text: title }), card);

  function ask() {
    clear(card);
    const q = questions[i];
    const order = shuffle(q.opts.map((o, k) => ({ o, k })));
    card.append(
      h('div', { class: 'qmeta' }, `第 ${i + 1} / ${questions.length} 題`, h('span', { class: 'lv lv' + q.level, text: ['', '基礎', '進階', '精熟'][q.level] })),
      h('p', { class: 'qtext', text: q.q }));
    const list = h('div', { class: 'opts', role: 'group', 'aria-label': '選項' });
    const fb = h('div', { class: 'feedback', 'aria-live': 'polite' });
    const nextBtn = h('button', { type: 'button', class: 'btn btn-primary', hidden: true }, i + 1 < questions.length ? '下一題 →' : (mode === 'test' ? '交卷，看成績' : '看結果'));
    nextBtn.addEventListener('click', () => { i++; i < questions.length ? ask() : finish(); });
    order.forEach((it, n) => {
      const b = h('button', { type: 'button', class: 'opt' }, h('span', { class: 'k', text: String.fromCharCode(65 + n) }), it.o);
      b.addEventListener('click', () => {
        const ok = it.k === q.answer;
        results.push({ q, ok, picked: it.k });
        onAnswer && onAnswer(q, ok);
        [...list.children].forEach((c, idx) => { c.disabled = true; if (mode === 'practice') { if (order[idx].k === q.answer) c.classList.add('right'); else if (idx === n) c.classList.add('wrong'); } else if (idx === n) c.classList.add('picked'); });
        if (mode === 'practice') {
          fb.append(h('p', { class: ok ? 'ok' : 'bad', text: ok ? '✔ 答對了！' : '✘ 再想一想。正確答案是「' + q.opts[q.answer] + '」。' }), h('p', { class: 'explain' }, h('b', { text: '解析：' }), q.explain));
        } else fb.append(h('p', { class: 'note', text: '已作答。' }));
        nextBtn.hidden = false; nextBtn.focus();
      });
      list.append(b);
    });
    card.append(list, fb, nextBtn);
  }
  function finish() { onDone && onDone(results); }
  ask();
}
