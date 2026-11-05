/* 家長模式：查看這台裝置上的學習狀況（不跨裝置同步、不上傳） */
import { h, clear } from '../components/dom.js';
import { answerText } from '../components/quiz.js';
import * as R from '../store/records.js';
import { requireRole, leave } from './gate.js';
import { loadUnits, analyze, reportText, download, fmtDur, fmtDate, unitName } from './report.js';

const main = document.getElementById('main');
requireRole('parent', '家長模式', main, start);

async function start() {
  clear(main); main.append(h('p', { class: 'note', text: '載入中…' }));
  const units = await loadUnits(); const names = R.profileNames();
  clear(main);
  if (!names.length) { main.append(h('section', { class: 'panel' }, h('h2', { text: '還沒有學習紀錄' }), h('p', { text: '這台裝置上還沒有小朋友開始學習。請先到學生畫面開始一個單元。' }), h('a', { class: 'btn btn-primary', href: 'index.html', text: '回學生畫面' }))); return; }
  let viewing = names.includes(R.nickname()) ? R.nickname() : names[0];
  const body = h('div', {});
  const sel = h('select', { 'aria-label': '選擇小朋友的暱稱', onchange: (e) => { viewing = e.target.value; draw(); } }, ...names.map((n) => h('option', { value: n, selected: n === viewing, text: n })));
  main.append(
    h('section', { class: 'panel no-print' }, h('h2', { text: '家長模式' }),
      h('p', { class: 'note', text: '只顯示這台裝置、這個瀏覽器上的紀錄。換裝置、換瀏覽器或清除網站資料，就看不到了；這裡沒有帳號，也不會同步到其他裝置。' }),
      h('div', { class: 'row' }, h('label', {}, '查看：', sel), h('a', { class: 'btn', href: 'index.html', text: '回學生畫面' }), h('button', { type: 'button', class: 'btn', onclick: () => { leave('parent'); location.href = 'index.html'; } }, '離開家長模式'))),
    body);

  function draw() {
    clear(body);
    const analyses = Object.values(units).map((u) => analyze(u, R.peekUnit(viewing, u.id)));
    const started = analyses.filter((a) => a.started), done = analyses.filter((a) => a.completed);
    const totalSec = analyses.reduce((s, a) => s + a.timeSec, 0);
    body.append(h('section', { class: 'panel' }, h('h2', { text: `${viewing} 的學習總覽` }),
      h('div', { class: 'stats' }, stat('已開始單元', started.length + ' / ' + analyses.length), stat('已通關單元', String(done.length)), stat('累計學習時間', fmtDur(totalSec)), stat('小幫手使用', analyses.reduce((s, a) => s + a.tutor.total, 0) + ' 次')),
      h('div', { class: 'row no-print' },
        h('button', { type: 'button', class: 'btn btn-primary', onclick: () => download(`學習報告-${viewing}.txt`, reportText(viewing, analyses)) }, '⬇ 下載文字報告'),
        h('button', { type: 'button', class: 'btn', onclick: async (e) => { try { await navigator.clipboard.writeText(reportText(viewing, analyses)); e.target.textContent = '✔ 已複製'; } catch (err) { e.target.textContent = '無法複製，請改用下載'; } } }, '複製報告文字'),
        h('button', { type: 'button', class: 'btn', onclick: () => window.print() }, '🖨 列印／存成 PDF'),
        h('button', { type: 'button', class: 'btn', onclick: () => download(`學習紀錄-${viewing}.json`, JSON.stringify({ exportedAt: new Date().toISOString(), profile: viewing, data: (R.exportAll().profiles[viewing] || {}) }, null, 1), 'application/json') }, '下載原始紀錄（JSON）'))));
    analyses.forEach((a) => body.append(unitCard(a)));
  }
  const stat = (k, v) => h('div', { class: 'stat' }, h('b', { text: v }), h('span', { text: k }));

  function unitCard(a) {
    const u = a.unit; const box = h('section', { class: 'panel unit-report' }, h('h3', { text: unitName(u) }));
    if (!a.started) { box.append(h('p', { class: 'note', text: '還沒開始。' }), h('a', { class: 'btn no-print', href: 'unit.html?id=' + u.id, text: '開啟這個單元' })); return box; }
    box.append(h('p', {}, h('span', { class: 'tag-kind', text: a.completed ? '★ 已通關' : '學習中' }), ` 完成 ${a.steps.length} 個步驟・學習約 ${fmtDur(a.timeSec)}・開始於 ${fmtDate(R.peekUnit(viewing, u.id).startedAt)}`));
    box.append(h('ul', {}, h('li', { text: '單元測驗：' + (a.tests.length ? `${a.tests.length} 次，最高 ${a.bestTest}%，最近一次 ${a.lastTest.score}/${a.lastTest.total}（${a.lastTest.percent}%）` : '還沒有') }),
      h('li', { text: '完成的實驗：' + (a.labs.length ? a.labs.map((k) => (u.labs.find((l) => l.id === k) || { title: k }).title).join('、') : '還沒有') }),
      h('li', { text: '作答正確率：' + (a.accuracy == null ? '還沒有作答' : `${a.accuracy}%（共 ${a.attempts} 次作答）`) }),
      h('li', { text: '小幫手：' + (a.tutor.total ? `使用 ${a.tutor.total} 次` : '沒有使用') })));
    if (a.tags.length) {
      box.append(h('h4', { text: '各知識點表現（依知識標籤分析）' }), h('table', { class: 'tbl' }, h('tr', {}, ...['知識點', '答對', '狀態', ''].map((x) => h('th', { text: x }))),
        ...a.tags.map((t) => h('tr', { class: t.state === '不熟' ? 'bad-row' : t.state === '待加強' ? 'warn-row' : '' }, h('td', { text: t.name }), h('td', { text: `${t.ok}/${t.n}（${t.pct}%）` }), h('td', { text: t.state + (t.last2Wrong ? '・連續答錯' : '') }), h('td', {}, t.state === '熟悉' || t.state === '資料不足' ? '' : h('a', { class: 'btn no-print', href: t.link, text: '複習' }))))));
    }
    const weak = a.tags.filter((t) => t.state === '不熟' || t.state === '待加強');
    box.append(h('div', { class: 'suggest' }, h('b', { text: '建議複習' }), weak.length ? h('ul', {}, ...weak.slice(0, 4).map((t) => h('li', {}, `${t.name}：`, h('a', { href: t.link, text: '回到對應的教材或實驗' })))) : h('p', { class: 'note', text: a.tags.length ? '目前各知識點都不錯，繼續保持！' : '還沒有足夠的作答資料。' })));
    const open = a.wrong.filter((w) => !w.lastOk);
    if (open.length) box.append(h('details', { class: 'static-alt' }, h('summary', { text: `還沒答對的題目（${open.length} 題）` }), ...open.slice(0, 12).map((w) => h('div', { class: 'wrongq' }, h('p', {}, h('b', { text: w.q.q })), h('p', { class: 'ok', text: '正確答案：' + answerText(w.q) }), h('p', { class: 'explain', text: '解析：' + w.q.explain })))));
    return box;
  }
  draw();
}
