/* 島嶼、橋樑、樹木與裝飾（樹／花／石使用 InstancedMesh 減少 draw call） */
import * as THREE from 'three';
import { createBuilding } from './buildings.js';

export const TOP = 0.75;      // 草地表面高度
export const RADIUS = 9;
const SLOT_R = 4.4;

function mulberry(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const clay = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.88, metalness: 0, ...o });

function distToSeg(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az; const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(px - (ax + t * dx), pz - (az + t * dz));
}

function createIsland(theme, slots, seed, mobile) {
  const g = new THREE.Group(); const rand = mulberry(seed); const picks = [];
  const add = (m, pick) => { m.castShadow = true; m.receiveShadow = true; g.add(m); if (pick) picks.push(m); return m; };

  add(new THREE.Mesh(new THREE.CylinderGeometry(9.2, 3.6, 3.6, 48), clay(theme.rock)), true).position.y = -1.95;
  add(new THREE.Mesh(new THREE.CylinderGeometry(9.45, 9.65, 0.6, 56), clay(theme.sand)), true).position.y = 0.15;
  add(new THREE.Mesh(new THREE.CylinderGeometry(8.6, 9.0, 0.42, 56), clay(theme.grass)), true).position.y = 0.54;
  const lip = add(new THREE.Mesh(new THREE.TorusGeometry(8.8, 0.2, 10, 64), clay(theme.grassLight)), false); lip.rotation.x = Math.PI / 2; lip.position.y = 0.72;

  // 廣場＋道路
  const plaza = add(new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.8, 0.1, 32), clay(0xfff1dc)), true); plaza.position.y = TOP + 0.04;
  const ring = add(new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.07, 8, 32), clay(theme.accent)), false); ring.rotation.x = Math.PI / 2; ring.position.y = TOP + 0.1;
  const fo = add(new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 0.35, 20), clay(0xe9f6ff)), false); fo.position.y = TOP + 0.25;
  add(new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 10), clay(0xbfe6f5)), false).position.y = TOP + 0.55;
  const from = 1.7;
  for (const s of slots) {
    const d = Math.hypot(s.x, s.z), len = d - from - 1.3;
    const p = add(new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.07, len), clay(0xfff1dc)), true);
    const mid = from + len / 2; p.position.set((s.x / d) * mid, TOP + 0.03, (s.z / d) * mid); p.rotation.y = Math.atan2(s.x, s.z);
  }

  // 樹木（兩層錐形樹冠＋樹幹）
  const spots = [];
  for (let tries = 0; tries < 400 && spots.length < (mobile ? 22 : 34); tries++) {
    const a = rand() * Math.PI * 2, r = 3 + rand() * 5.1, x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (slots.some((s) => Math.hypot(x - s.x, z - s.z) < 2.9)) continue;
    if (slots.some((s) => distToSeg(x, z, 0, 0, s.x, s.z) < 1.1)) continue;
    if (spots.some((p) => Math.hypot(x - p.x, z - p.z) < 1.1)) continue;
    spots.push({ x, z, s: 0.75 + rand() * 0.6 });
  }
  const n = spots.length, dummy = new THREE.Object3D();
  const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.1, 0.14, 0.6, 8), clay(0x9c7a55), n);
  const leafA = new THREE.InstancedMesh(new THREE.ConeGeometry(0.62, 0.9, 10), clay(0xffffff), n);
  const leafB = new THREE.InstancedMesh(new THREE.ConeGeometry(0.45, 0.75, 10), clay(0xffffff), n);
  const col = new THREE.Color();
  spots.forEach((p, i) => {
    const y = TOP + 0.05;
    dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(p.s);
    dummy.position.set(p.x, y + 0.3 * p.s, p.z); dummy.updateMatrix(); trunks.setMatrixAt(i, dummy.matrix);
    dummy.position.set(p.x, y + 0.95 * p.s, p.z); dummy.updateMatrix(); leafA.setMatrixAt(i, dummy.matrix);
    dummy.position.set(p.x, y + 1.45 * p.s, p.z); dummy.updateMatrix(); leafB.setMatrixAt(i, dummy.matrix);
    col.set(theme.trees[Math.floor(rand() * theme.trees.length)]); leafA.setColorAt(i, col); leafB.setColorAt(i, col);
  });
  for (const m of [trunks, leafA, leafB]) { m.castShadow = true; m.receiveShadow = true; g.add(m); }

  // 石頭
  const rocks = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.5, 0), clay(0xd2d0dc), 9);
  for (let i = 0; i < 9; i++) {
    const a = rand() * Math.PI * 2, r = 7.4 + rand() * 1.0, s = 0.35 + rand() * 0.5;
    dummy.position.set(Math.cos(a) * r, TOP + s * 0.25, Math.sin(a) * r); dummy.rotation.set(rand() * 3, rand() * 3, rand() * 3); dummy.scale.set(s, s * 0.7, s);
    dummy.updateMatrix(); rocks.setMatrixAt(i, dummy.matrix);
  }
  rocks.castShadow = true; rocks.receiveShadow = true; g.add(rocks);

  // 小花
  const fl = new THREE.InstancedMesh(new THREE.SphereGeometry(0.1, 8, 6), clay(0xffffff), 40);
  const fc = [0xff9fc0, 0xffe27a, 0xffffff, 0xb9a6ff];
  for (let i = 0; i < 40; i++) {
    let x, z, k = 0;
    do { const a = rand() * Math.PI * 2, r = 2.2 + rand() * 6; x = Math.cos(a) * r; z = Math.sin(a) * r; k++; }
    while (k < 20 && (slots.some((s) => Math.hypot(x - s.x, z - s.z) < 2.4) || slots.some((s) => distToSeg(x, z, 0, 0, s.x, s.z) < 0.8)));
    dummy.position.set(x, TOP + 0.08, z); dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(0.8 + rand() * 0.6); dummy.updateMatrix(); fl.setMatrixAt(i, dummy.matrix);
    fl.setColorAt(i, col.set(fc[i % fc.length]));
  }
  g.add(fl);

  // 海面白色浪花
  const foam = new THREE.Mesh(new THREE.RingGeometry(9.5, 10.6, 64), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.45, depthWrite: false }));
  foam.rotation.x = -Math.PI / 2; foam.position.y = 0.22; g.add(foam);

  return { group: g, picks };
}

function createBridge(x1, x2) {
  const g = new THREE.Group(); const n = 15, w = 1.5, peak = 0.9;
  const wood = clay(0xe8c28f), rail = clay(0xfff1dc), stone = clay(0xd9d4cf);
  const yAt = (t) => TOP - 0.05 + Math.sin(Math.PI * t) * peak;
  for (let i = 0; i < n; i++) {
    const t0 = i / n, t1 = (i + 1) / n, t = (t0 + t1) / 2;
    const xa = x1 + (x2 - x1) * t0, xb = x1 + (x2 - x1) * t1, ya = yAt(t0), yb = yAt(t1);
    const len = Math.hypot(xb - xa, yb - ya) + 0.02;
    const p = new THREE.Mesh(new THREE.BoxGeometry(len, 0.14, w), wood);
    p.position.set((xa + xb) / 2, (ya + yb) / 2, 0); p.rotation.z = Math.atan2(yb - ya, xb - xa);
    p.castShadow = p.receiveShadow = true; g.add(p);
    if (i % 2 === 0) for (const s of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.55, 8), rail);
      post.position.set(xa, ya + 0.35, s * (w / 2 - 0.05)); post.castShadow = true; g.add(post);
    }
  }
  for (const s of [-1, 1]) { // 欄杆橫條
    for (let i = 0; i < n; i++) {
      const t0 = i / n, t1 = (i + 1) / n, xa = x1 + (x2 - x1) * t0, xb = x1 + (x2 - x1) * t1, ya = yAt(t0) + 0.6, yb = yAt(t1) + 0.6;
      const r = new THREE.Mesh(new THREE.BoxGeometry(Math.hypot(xb - xa, yb - ya) + 0.02, 0.07, 0.07), rail);
      r.position.set((xa + xb) / 2, (ya + yb) / 2, s * (w / 2 - 0.05)); r.rotation.z = Math.atan2(yb - ya, xb - xa); g.add(r);
    }
  }
  const mid = (x1 + x2) / 2;
  for (const dx of [-1.6, 1.6]) { // 橋墩
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 3.2, 14), stone);
    p.position.set(mid + dx, -1.0, 0); p.castShadow = true; g.add(p);
  }
  return g;
}

const THEMES = {
  g5: { grass: 0xa9e0a0, grassLight: 0xc4efb8, sand: 0xf6e3b8, rock: 0xcdb8a2, accent: 0xff9fc0, trees: [0x7fcf88, 0x95d98c, 0x6fc07e, 0xa6e29a] },
  g6: { grass: 0xb4dcc8, grassLight: 0xcdeedd, sand: 0xf6e3b8, rock: 0xbcb4cf, accent: 0xa6a2f0, trees: [0x7fcfa8, 0x8dd7c0, 0x9ad3e6, 0xb2c2f0] },
};

/* 建立整個群島。回傳 islands（每島的 group／picks／中心）與 buildings（可互動物件）。 */
export function buildArchipelago(scene, grades, { mobile = false } = {}) {
  const islands = {}, buildings = [], root = new THREE.Group(); scene.add(root);
  const angles = [135, 45, 225, 315]; // 國語、數學、社會、自然的位置（面向鏡頭那一側優先）

  grades.forEach((gr, gi) => {
    const slots = gr.subjects.map((_, i) => { const a = (angles[i] * Math.PI) / 180; return { x: Math.cos(a) * SLOT_R, z: Math.sin(a) * SLOT_R }; });
    const { group, picks } = createIsland(THEMES[gr.id], slots, 11 + gi * 7, mobile);
    group.position.set(gr.x, 0, 0); root.add(group);
    picks.forEach((m) => { m.userData.islandId = gr.id; });
    islands[gr.id] = { id: gr.id, grade: gr, group, picks, center: new THREE.Vector3(gr.x, 0, 0), phase: gi * 1.7 };

    gr.subjects.forEach((s, i) => {
      const bg = createBuilding(s.building, { soon: !s.teachReady });
      const sl = slots[i];
      bg.position.set(sl.x, TOP, sl.z);
      bg.rotation.y = Math.atan2(-sl.x, -sl.z); // 正面朝向島中心
      group.add(bg);
      const b = { id: gr.id + ':' + s.id, grade: gr, subject: s, group: bg, island: islands[gr.id], height: bg.userData.height, slot: sl, hover: 0, bounceT: 9 };
      bg.userData.building = b;
      buildings.push(b);
    });
  });

  const bridge = createBridge(grades[0].x + RADIUS + 0.2, grades[1].x - RADIUS - 0.2);
  root.add(bridge);
  return { root, islands, buildings, bridge };
}
