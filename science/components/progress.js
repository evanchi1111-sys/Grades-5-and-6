/* 學習流程：步驟與完成狀態（各單元可有不同的步驟組合：unit.flow） */
import { h } from './dom.js';

export const STEPS = [
  { id: 'scenario', name: '情境任務', icon: '🧭' },
  { id: 'lesson', name: '知識教室', icon: '📖' },
  { id: 'lab', name: '互動實驗室', icon: '🔬' },
  { id: 'demo', name: '老師示範', icon: '👩‍🏫' },
  { id: 'practice', name: '闖關練習', icon: '🎯' },
  { id: 'test', name: '單元測驗', icon: '📝' },
  { id: 'result', name: '學習成果', icon: '🏆' },
];
export const DEFAULT_FLOW = STEPS.map((s) => s.id);
export const flowOf = (unit) => (unit && unit.flow && unit.flow.length ? unit.flow : DEFAULT_FLOW);
export const stepName = (id) => (STEPS.find((s) => s.id === id) || { name: id }).name;

export function renderStepper(root, current, rec, onGo, flow = DEFAULT_FLOW) {
  root.textContent = '';
  const list = STEPS.filter((s) => flow.includes(s.id));
  list.forEach((s, i) => {
    const done = !!rec.steps[s.id];
    root.append(h('button', { type: 'button', class: 'step' + (s.id === current ? ' on' : '') + (done ? ' done' : ''), 'aria-current': s.id === current ? 'step' : null, onclick: () => onGo(s.id) },
      h('span', { class: 'si', text: done ? '✔' : s.icon }), h('span', { class: 'sn', text: (i + 1) + '. ' + s.name })));
  });
}

export function fmtDuration(sec) { const m = Math.floor(sec / 60); return m < 1 ? '不到 1 分鐘' : m + ' 分鐘'; }
