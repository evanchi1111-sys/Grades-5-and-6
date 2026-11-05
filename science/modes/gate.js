/* 身分切換的「防誤觸」小關卡
 * ⚠ 這不是安全機制：沒有帳號、沒有密碼，任何會做算式的人都能進入。目的只是避免小朋友不小心點進家長／老師畫面。
 * 通過狀態只存在這個分頁的 sessionStorage，關閉分頁後失效。 */
import { h } from '../components/dom.js';

const key = (role) => 'adv-role-' + role;
export function passed(role) { try { return sessionStorage.getItem(key(role)) === '1'; } catch (e) { return false; } }
export function leave(role) { try { sessionStorage.removeItem(key(role)); } catch (e) { /* 忽略 */ } }

export function requireRole(role, label, mount, onPass) {
  if (passed(role)) { onPass(); return; }
  const a = 6 + Math.floor(Math.random() * 4), b = 7 + Math.floor(Math.random() * 3);
  const input = h('input', { type: 'text', inputmode: 'numeric', 'aria-label': `${a} 乘以 ${b} 等於多少`, maxlength: 3 });
  const msg = h('p', { class: 'note', 'aria-live': 'polite' });
  const go = () => {
    if (+input.value === a * b) { try { sessionStorage.setItem(key(role), '1'); } catch (e) { /* 無法儲存就只通過這一次 */ } mount.textContent = ''; onPass(); }
    else { msg.textContent = '答案不對，再試一次。'; input.select(); }
  };
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
  mount.append(h('section', { class: 'panel' }, h('h2', { text: label + '入口' }),
    h('p', {}, '這個畫面是給', role === 'parent' ? '家長' : '老師', '使用的。請先回答：'),
    h('p', { class: 'qtext', text: `${a} × ${b} = ？` }), h('div', { class: 'row' }, input, h('button', { type: 'button', class: 'btn btn-primary', onclick: go }, '進入')), msg,
    h('p', { class: 'note', text: '※ 這個小關卡只是防止誤觸，不是密碼，也不是安全機制。' }), h('a', { class: 'btn', href: 'index.html', text: '← 回學生畫面' })));
  input.focus();
}
