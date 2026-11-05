/* 互動：懸停、點擊、相機飛行、標籤 */
import * as THREE from 'three';
import { TOP } from './islands.js';
import { isOpen } from './data.js';

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export function createInteraction({ world, arch, ui, reduced }) {
  const { camera, controls, canvas } = world;
  const raycaster = new THREE.Raycaster(); const ndc = new THREE.Vector2();
  const tip = document.getElementById('tip'); const labelsEl = document.getElementById('labels');
  const buildings = arch.buildings;
  const islandList = Object.values(arch.islands);
  const pickTargets = [...buildings.map((b) => b.group), ...islandList.flatMap((i) => i.picks)];

  const state = { mode: 'overview', grade: null, subjectKey: null };

  /* ---- 視角 ---- */
  const V = {
    overview: () => ({ pos: new THREE.Vector3(0, 19, 31), target: new THREE.Vector3(0, 1, 0) }),
    bird: () => ({ pos: new THREE.Vector3(0, 70, 14), target: new THREE.Vector3(0, 0, 0) }),
    island: (id) => { const c = arch.islands[id].center; return { pos: new THREE.Vector3(c.x * 0.8, 17, 23), target: new THREE.Vector3(c.x, 1, 0) }; },
    building: (b) => {
      const wp = new THREE.Vector3(); b.group.getWorldPosition(wp);
      const dir = new THREE.Vector3(-b.slot.x, 0, -b.slot.z).normalize();
      return { pos: wp.clone().addScaledVector(dir, 14).add(new THREE.Vector3(0, 7.5 + b.height * 0.3, 0)), target: wp.clone().add(new THREE.Vector3(0, b.height * 0.35, 0)) };
    },
  };

  // 直式螢幕（手機）寬度不足，鏡頭需拉遠才看得到整座島
  // halfW：要完整看到的半寬（世界單位）。依視野與長寬比算出需要的最小距離，必要時拉遠。
  const fit = (v, halfW) => {
    const { w, h } = world.size, a = w / h;
    const need = halfW / (Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * a);
    const off = v.pos.clone().sub(v.target), d = off.length();
    if (need > d) v.pos.copy(v.target).addScaledVector(off, need / d);
    return v;
  };
  { const o = V.overview, i = V.island, bd = V.building;
    V.overview = () => fit(o(), 27); V.island = (id) => fit(i(id), 12.5); V.building = (b) => fit(bd(b), 5.5); }

  /* ---- 相機飛行 ---- */
  let tween = null;
  function fly(view, shift = { x: 0, y: 0 }, dur = 1.1) {
    if (reduced || dur === 0) {
      camera.position.copy(view.pos); controls.target.copy(view.target); world.setShift(shift.x, shift.y); controls.update(); tween = null; return;
    }
    tween = { t: 0, start: performance.now(), dur, p0: camera.position.clone(), p1: view.pos.clone(), g0: controls.target.clone(), g1: view.target.clone(), s0: { ...world.shift }, s1: shift,
      lift: Math.max(2, camera.position.distanceTo(view.pos) * 0.12) };
  }
  controls.addEventListener('start', () => { tween = null; });
  function cardShift() {
    const { w, h } = world.size;
    return w > 820 ? { x: Math.min(210, w * 0.2), y: 0 } : { x: 0, y: h * 0.2 };
  }

  /* ---- 對外動作 ---- */
  function focusOverview() { state.mode = 'overview'; state.grade = null; state.subjectKey = null; ui.hideCard(); ui.setActive(null, null); ui.setMode('overview'); fly(V.overview()); }
  function focusBird() { state.mode = 'bird'; state.subjectKey = null; ui.hideCard(); ui.setMode('bird'); fly(V.bird()); }
  function focusGrade(id) { state.mode = 'island'; state.grade = id; state.subjectKey = null; ui.hideCard(); ui.setActive(id, null); ui.setMode('island'); fly(V.island(id)); }
  function focusSubject(gradeId, subjectId) {
    const b = buildings.find((x) => x.id === gradeId + ':' + subjectId); if (!b) return;
    state.mode = 'subject'; state.grade = gradeId; state.subjectKey = b.id;
    b.bounceT = 0; ui.setMode('island');
    fly(V.building(b), cardShift(), 1.0);
    ui.showCard(b.grade, b.subject);
  }
  function closeCard() { if (state.grade) focusGrade(state.grade); else focusOverview(); }

  /* ---- 指標 ---- */
  function setRay(e) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
  }
  function pick(e) {
    setRay(e);
    const hit = raycaster.intersectObjects(pickTargets, true)[0]; if (!hit) return null;
    for (let o = hit.object; o; o = o.parent) {
      if (o.userData.building) return { building: o.userData.building };
      if (o.userData.islandId) return { island: o.userData.islandId };
    }
    return null;
  }

  let down = null, hovered = null, raf = 0, lastMove = null;
  canvas.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
  canvas.addEventListener('pointerup', (e) => {
    if (!down) return; const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y), dt = performance.now() - down.t; down = null;
    if (moved > 6 || dt > 600) return;
    const p = pick(e); if (!p) return;
    if (p.building) focusSubject(p.building.grade.id, p.building.subject.id);
    else if (p.island) focusGrade(p.island);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' || (e.buttons & 7)) { setHover(null); return; }
    lastMove = e; if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0; const p = pick(lastMove); const b = p && p.building ? p.building : null; setHover(b, lastMove);
      canvas.style.cursor = p ? 'pointer' : 'grab';
    });
  });
  canvas.addEventListener('pointerleave', () => setHover(null));
  function setHover(b, e) {
    hovered = b;
    if (!b) { tip.classList.remove('on'); return; }
    tip.textContent = '';
    const s = b.subject; const t1 = document.createElement('b'); t1.textContent = b.grade.name + s.name + '・' + s.buildingName;
    const t2 = document.createElement('span'); t2.textContent = isOpen(s) ? '點一下查看' : '教材準備中（刷題與考卷可用）';
    tip.append(t1, t2); tip.style.setProperty('--c', s.color);
    const r = canvas.getBoundingClientRect(); tip.style.left = e.clientX - r.left + 'px'; tip.style.top = e.clientY - r.top + 'px'; tip.classList.add('on');
  }

  /* ---- 標籤 ---- */
  const tags = [];
  islandList.forEach((i) => { const d = document.createElement('div'); d.className = 'tag island-tag'; d.textContent = i.grade.islandName; labelsEl.append(d); tags.push({ el: d, kind: 'island', anchor: new THREE.Vector3(i.center.x, 10, 0) }); });
  buildings.forEach((b) => {
    const d = document.createElement('div'); d.className = 'tag b-tag' + (isOpen(b.subject) ? '' : ' soon'); d.style.setProperty('--c', b.subject.color);
    d.textContent = b.subject.name + (isOpen(b.subject) ? '' : '・準備中'); labelsEl.append(d);
    tags.push({ el: d, kind: 'building', b, anchor: new THREE.Vector3() });
  });
  const tmp = new THREE.Vector3(), wp = new THREE.Vector3();
  function updateTags() {
    const { w, h } = world.size;
    for (const t of tags) {
      if (t.kind === 'building') { t.b.group.getWorldPosition(wp); t.anchor.copy(wp).y += t.b.height + 0.7; }
      const dist = camera.position.distanceTo(t.anchor);
      tmp.copy(t.anchor).project(camera);
      const vis = tmp.z < 1 && Math.abs(tmp.x) < 1.15 && Math.abs(tmp.y) < 1.15;
      let op = 1;
      if (t.kind === 'building') op = dist > 33 || dist < 7 ? 0 : 1; else op = dist < 16 ? 0 : 1;
      if (t.kind === 'building' && state.subjectKey === t.b.id) op = 0;
      t.el.style.opacity = vis ? op : 0;
      t.el.style.transform = `translate(${((tmp.x * 0.5 + 0.5) * w).toFixed(1)}px,${((-tmp.y * 0.5 + 0.5) * h).toFixed(1)}px) translate(-50%,-100%)`;
    }
  }

  /* ---- 每幀更新 ---- */
  world.onUpdate((dt, time) => {
    if (tween) {
      // 用實際時間計算（低幀率裝置上轉場仍在約 1 秒內完成，不會變成慢動作）
      tween.t = (performance.now() - tween.start) / 1000 / tween.dur; const k = Math.min(tween.t, 1), e = ease(k);
      camera.position.lerpVectors(tween.p0, tween.p1, e); camera.position.y += Math.sin(Math.PI * e) * tween.lift;
      controls.target.lerpVectors(tween.g0, tween.g1, e);
      world.setShift(tween.s0.x + (tween.s1.x - tween.s0.x) * e, tween.s0.y + (tween.s1.y - tween.s0.y) * e);
      if (k >= 1) tween = null;
    }
    for (const i of islandList) i.group.position.y = reduced ? 0 : Math.sin(time * 0.8 + i.phase) * 0.12;
    for (const b of buildings) {
      const target = hovered === b ? 1 : 0; b.hover += (target - b.hover) * Math.min(1, dt * 10);
      let k = 0; if (b.bounceT < 1.2) { b.bounceT += dt; k = reduced ? 0 : Math.exp(-5 * b.bounceT) * Math.sin(16 * b.bounceT) * 0.12; }
      const hs = 1 + 0.07 * b.hover;
      b.group.scale.set(hs * (1 - k * 0.5), hs * (1 + k), hs * (1 - k * 0.5));
      b.group.position.y = TOP + (reduced ? 0 : b.hover * 0.22);
    }
    updateTags();
  });

  return { focusOverview, focusBird, focusGrade, focusSubject, closeCard, state };
}
