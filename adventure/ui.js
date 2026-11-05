/* 介面層：不依賴 Three.js，WebGL／CDN 失敗時仍可單獨運作（備援介面） */
import { GRADES, SITE } from './data.js';

function el(tag, attrs, ...kids) {
  const e = document.createElement(tag);
  for (const k in attrs || {}) {
    const v = attrs[k];
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'text') e.textContent = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat()) if (c != null) e.append(c.nodeType ? c : document.createTextNode(c));
  return e;
}

function linkBtn(label, url, cls, ext) {
  if (!url) return el('span', { class: 'btn disabled', 'aria-disabled': 'true' }, label + '（準備中）');
  return el('a', { class: 'btn ' + (cls || ''), href: url, target: ext ? '_blank' : null, rel: ext ? 'noopener' : null }, label);
}

/* 唯讀：讀取互動教材的學習狀態（不寫入、不建立任何資料） */
function labStatus(unitId) {
  try {
    const o = JSON.parse(localStorage.getItem('adv-sci-v1') || 'null'); const u = o && o.current && o.profiles[o.current] && o.profiles[o.current].units[unitId];
    if (!u) return '還沒開始。';
    return u.completedAt ? '★ 已通關，地標已點亮。' : '學習中（已完成 ' + Object.keys(u.steps || {}).length + ' 個步驟）。';
  } catch (e) { return ''; }
}

export function createUI(h) {
  const root = document.getElementById('ui');
  root.textContent = '';

  /* 頂部 */
  const gradeBtns = GRADES.map((g) => el('button', { type: 'button', class: 'pill', 'data-grade': g.id, onclick: () => h.onGrade(g.id) }, g.name));
  const btnOverview = el('button', { type: 'button', class: 'pill', onclick: () => h.onOverview() }, '全景');
  const btnBird = el('button', { type: 'button', class: 'pill', onclick: () => h.onBird() }, '鳥瞰');
  const btnHelp = el('button', { type: 'button', class: 'pill ghost', onclick: () => toggleHelp(true), 'aria-label': '操作說明' }, '？ 說明');
  const top = el('header', { class: 'top' },
    el('div', { class: 'brand' }, el('h1', { text: '學習冒險島' }), el('p', { text: '探索知識，開啟你的學習旅程' })),
    el('nav', { class: 'ctrls', 'aria-label': '視角與年級' }, gradeBtns, btnOverview, btnBird, btnHelp));

  /* 返回主視角 */
  const homeBtn = el('button', { type: 'button', class: 'floating', hidden: true, onclick: () => h.onOverview() }, '↩ 返回主視角');

  /* 資訊卡 */
  const card = el('aside', { class: 'card', role: 'dialog', 'aria-modal': 'false', 'aria-labelledby': 'card-title', hidden: true });

  /* 底部快速入口 */
  const chips = [];
  const chipRow = el('div', { class: 'chips', role: 'group', 'aria-label': '快速進入科目' });
  GRADES.forEach((g) => {
    chipRow.append(el('span', { class: 'chip-label', text: g.name }));
    g.subjects.forEach((s) => {
      const c = el('button', { type: 'button', class: 'chip', style: '--c:' + s.color, 'data-key': g.id + ':' + s.id,
        onclick: () => h.onSubject(g.id, s.id) }, s.name, s.teachReady ? null : el('i', { text: '準備中' }));
      chips.push(c); chipRow.append(c);
    });
  });
  const links = el('div', { class: 'quick' },
    el('a', { href: SITE.quizHome }, '刷題小勇者'),
    el('a', { href: SITE.overview }, '學習總覽・考卷'),
    el('a', { href: SITE.legacyHome }, '傳統首頁'));
  const bottom = el('footer', { class: 'bottom' }, chipRow, links);

  /* 說明 */
  const help = el('div', { class: 'modal', hidden: true, role: 'dialog', 'aria-label': '操作說明', onclick: (e) => { if (e.target === help) toggleHelp(false); } },
    el('div', { class: 'modal-box' },
      el('h2', { text: '怎麼玩？' }),
      el('ul', {},
        el('li', { text: '拖曳（手機：單指滑動）旋轉場景；滾輪（手機：雙指捏合）放大縮小。' }),
        el('li', { text: '點島嶼：鏡頭飛到那座島。點建築：打開科目資訊卡。' }),
        el('li', { text: '資訊卡可進入教材、開始刷題、開啟考卷。底部按鈕也能直接選科目。' }),
        el('li', { text: '「全景」看兩座島，「鳥瞰」從高空俯視，「返回主視角」回到開始的畫面。' }),
        el('li', { text: '灰色的建築表示該科教材準備中，但仍可使用已有的刷題與考卷。' }),
        el('li', { text: '學習進度仍由原本的刷題與學習島頁面記錄在這台裝置上，這個入口不會更動它。' })),
      el('button', { type: 'button', class: 'btn btn-primary', onclick: () => toggleHelp(false) }, '知道了')));

  root.append(top, homeBtn, card, bottom, help);

  function toggleHelp(on) { help.hidden = !on; if (on) help.querySelector('button').focus(); }

  let current = { grade: null, subject: null };

  function setActive(grade, subject) {
    current = { grade, subject };
    gradeBtns.forEach((b) => b.classList.toggle('on', b.dataset.grade === grade));
    chips.forEach((c) => c.classList.toggle('on', c.dataset.key === grade + ':' + subject));
  }
  function setMode(mode) { // overview | bird | grade
    btnOverview.classList.toggle('on', mode === 'overview');
    btnBird.classList.toggle('on', mode === 'bird');
    homeBtn.hidden = mode === 'overview';
  }

  function showCard(g, s) {
    card.textContent = '';
    card.style.setProperty('--c', s.color);
    const status = el('span', { class: 'status ' + (s.teachReady ? 'ok' : 'soon'), text: s.teachReady ? '教材已開放' : '教材準備中' });
    card.append(
      el('div', { class: 'card-head' },
        el('div', {}, el('div', { class: 'eyebrow', text: g.name + '・' + s.name }), el('h2', { id: 'card-title', text: s.buildingName }), status),
        el('button', { type: 'button', class: 'x', 'aria-label': '關閉', onclick: () => h.onClose() }, '✕')),
      el('p', { class: 'desc', text: s.desc }),
      el('section', {}, el('h3', { text: '教材' }),
        el('div', { class: 'row' }, linkBtn('進入教材', s.teach, 'btn-primary'))),
      s.labs ? el('section', {}, el('h3', { text: '互動教材（新）' }),
        el('div', { class: 'row' }, s.labs.map((l, i) => linkBtn(l.label, l.url, i === 0 ? 'btn-primary' : '')), linkBtn('全部互動單元', s.more)),
        s.labs.map((l) => el('p', { class: 'note', text: l.label.replace('（互動教材）', '') + '：' + labStatus(l.unit) })),
        el('p', { class: 'note', text: '新增內容標示「待審核」；原教材與題庫完全保留。' })) : null,
      el('section', {}, el('h3', { text: '開始刷題' }),
        el('div', { class: 'row' }, s.quizzes.map((q, i) => linkBtn(q.label, q.url, i === 0 ? 'btn-accent' : '')))),
      el('section', {}, el('h3', { text: '考卷／測驗' }),
        el('div', { class: 'row' }, s.exams.map((x) => linkBtn(x.label, x.url, '', true))),
        el('p', { class: 'note', text: 'PDF 會在新分頁開啟；iPad 可直接用「標記」手寫。' })),
      el('button', { type: 'button', class: 'btn back', onclick: () => h.onClose() }, '↩ 返回島嶼'));
    card.hidden = false;
    card.classList.remove('in'); void card.offsetWidth; card.classList.add('in');
    setActive(g.id, s.id);
    card.querySelector('.x').focus({ preventScroll: true });
  }
  function hideCard() { card.hidden = true; setActive(current.grade, null); }
  function isCardOpen() { return !card.hidden; }

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!help.hidden) toggleHelp(false); else if (!card.hidden) h.onClose();
  });

  return { setActive, setMode, showCard, hideCard, isCardOpen, toggleHelp };
}

export function hideLoading() {
  const l = document.getElementById('loading');
  if (l) { l.classList.add('gone'); setTimeout(() => l.remove(), 600); }
}

/* 備援介面：3D 無法使用時，仍可進入所有原有內容 */
export function renderFallback(reason) {
  const box = document.getElementById('static-fallback');
  if (!box) return;
  document.getElementById('loading')?.remove();
  document.getElementById('stage')?.setAttribute('hidden', '');
  document.getElementById('ui')?.setAttribute('hidden', '');
  box.textContent = '';
  box.append(
    el('h1', { text: '學習冒險島' }),
    el('p', { class: 'why', text: '3D 場景暫時無法載入' + (reason ? '（' + reason + '）' : '') + '，請從下面的入口繼續學習。' }),
    ...GRADES.map((g) => el('section', { class: 'fb-grade' }, el('h2', { text: g.islandName }),
      el('div', { class: 'fb-grid' }, g.subjects.map((s) => el('div', { class: 'fb-card', style: '--c:' + s.color },
        el('h3', { text: s.name + '・' + s.buildingName }),
        el('div', { class: 'row' },
          linkBtn('進入教材', s.teach, 'btn-primary'),
          linkBtn('直接刷題', s.quizzes[0].url, 'btn-accent'),
          linkBtn('期中總複習（PDF）', s.exams[0].url, '', true),
          linkBtn('答案（PDF）', s.exams[1].url, '', true)))))),
    ),
    el('p', { class: 'fb-links' }, el('a', { href: SITE.quizHome }, '刷題小勇者'), ' ・ ',
      el('a', { href: SITE.overview }, '學習總覽（所有考卷）'), ' ・ ', el('a', { href: SITE.legacyHome }, '傳統首頁')));
  box.hidden = false;
}
