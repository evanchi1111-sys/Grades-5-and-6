/* 啟動程式：任何一步失敗都會切換到備援介面，確保整頁不會空白 */
import { GRADES, applyPublished } from './data.js';
import { createUI, hideLoading, renderFallback } from './ui.js';

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 800;

function withTimeout(p, ms, msg) {
  return Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error(msg)), ms))]);
}

async function start() {
  const [{ createWorld }, { buildArchipelago }, { createInteraction }] = await withTimeout(
    Promise.all([import('./scene.js'), import('./islands.js'), import('./interaction.js')]),
    15000, '3D 程式庫載入逾時（請檢查網路）');

  try { await applyPublished(GRADES); } catch (e) { console.warn('已發布教材清單讀取失敗，沿用既有設定', e); } // 教材中央資料庫：新單元自動出現
  const canvas = document.getElementById('c'), stage = document.getElementById('stage');
  const world = createWorld(canvas, stage, { mobile, reduced });
  const arch = buildArchipelago(world.scene, GRADES, { mobile });

  let inter;
  const ui = createUI({
    onGrade: (id) => inter.focusGrade(id),
    onOverview: () => inter.focusOverview(),
    onBird: () => inter.focusBird(),
    onSubject: (g, s) => inter.focusSubject(g, s),
    onClose: () => inter.closeCard(),
  });
  inter = createInteraction({ world, arch, ui, reduced });
  ui.setMode('overview');

  // 初始鏡頭：由高處緩緩降到全景
  world.camera.position.set(0, 60, 60); inter.focusOverview();
  // 深層連結：#g5／#g6 聚焦該島，#g5-chi 這類直接開啟科目（原學習島頁的「回選科目」連結是 home.html#g5）
  const m = /^#(g[56])(?:-(chi|mat|soc|nat))?$/.exec(location.hash);
  if (m) { if (m[2]) inter.focusSubject(m[1], m[2]); else inter.focusGrade(m[1]); }
  window.__adv = { world, arch, inter, ui };
  window.__advReady = true;
  hideLoading();

  // WebGL context 遺失時改用備援介面
  world.canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); renderFallback('顯示卡中斷了 3D 繪圖'); });
}

start().catch((err) => {
  console.error('[學習冒險島] 3D 啟動失敗：', err);
  window.__advReady = true;
  renderFallback(err && err.message ? err.message : '未知錯誤');
});
