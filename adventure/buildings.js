/* 學科建築：全部以程式生成的幾何體組成（黏土質感：高粗糙度、圓角方塊） */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const matCache = new Map();
function M(c, o = {}) {
  const k = c + JSON.stringify(o);
  if (!matCache.has(k)) matCache.set(k, new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, metalness: 0, ...o }));
  return matCache.get(k);
}
function shadow(m) { m.castShadow = true; m.receiveShadow = true; return m; }
function rbox(w, h, d, c, x = 0, y = 0, z = 0, r = 0.07) {
  const rr = Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001);
  const m = shadow(new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, rr), M(c)));
  m.position.set(x, y, z); return m;
}
function cyl(rt, rb, h, c, x = 0, y = 0, z = 0, seg = 24) {
  const m = shadow(new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), M(c)));
  m.position.set(x, y, z); return m;
}
function sph(r, c, x = 0, y = 0, z = 0, o) {
  const m = shadow(new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), o ? M(c, o) : M(c)));
  m.position.set(x, y, z); return m;
}

const PAL = {
  library: { main: 0xff8a80, roof: 0xc95d55, trim: 0xfff0dc, accent: 0xffd27a, door: 0x8a5a44 },
  institute: { main: 0x9a9af2, roof: 0x6f6fd0, trim: 0xf1eeff, accent: 0xffd27a, door: 0x5b4b8a },
  museum: { main: 0xf6c75a, roof: 0xd9992a, trim: 0xfff5dc, accent: 0xe5645a, door: 0x8a5a44 },
  lab: { main: 0x86d484, roof: 0x4fa64f, trim: 0xf2fff0, accent: 0xff8fc0, door: 0x4d7a55 },
};
const SOON = { main: 0xd8d2c7, roof: 0xb4ada1, trim: 0xece7de, accent: 0xc7c0b3, door: 0x9c9488 };
const GLASS = 0xbfe6f5;

function library(P) {
  const g = new THREE.Group();
  g.add(rbox(3.4, 0.22, 2.8, P.trim, 0, 0.11, 0));
  g.add(rbox(2.9, 1.7, 2.1, P.main, 0, 1.07, -0.1));
  const roofGeo = new THREE.ConeGeometry(2.2, 1.1, 4); roofGeo.rotateY(Math.PI / 4);
  const roof = shadow(new THREE.Mesh(roofGeo, M(P.roof))); roof.scale.z = 0.7; roof.position.set(0, 2.47, -0.1); g.add(roof);
  for (const x of [-1.1, -0.37, 0.37, 1.1]) g.add(cyl(0.12, 0.12, 1.7, P.trim, x, 1.07, 1.1));
  g.add(rbox(2.9, 0.14, 0.5, P.trim, 0, 0.29, 1.15));
  g.add(rbox(0.7, 1.05, 0.12, P.door, 0, 0.8, 0.98));
  for (const s of [-1, 1]) g.add(rbox(0.1, 0.55, 0.45, GLASS, s * 1.46, 1.2, -0.1));
  for (const s of [-1, 1]) { const b = rbox(0.55, 0.07, 0.42, P.accent, s * 0.26, 3.1, -0.1); b.rotation.z = s * -0.28; g.add(b); }
  g.userData.height = 3.4;
  return g;
}

function institute(P) {
  const g = new THREE.Group();
  g.add(cyl(1.55, 1.65, 0.3, P.trim, 0, 0.15, 0, 32));
  g.add(cyl(1.2, 1.3, 1.5, P.main, 0, 1.05, 0, 32));
  const band = shadow(new THREE.Mesh(new THREE.TorusGeometry(1.26, 0.07, 10, 40), M(P.trim))); band.rotation.x = Math.PI / 2; band.position.y = 1.35; g.add(band);
  g.add(cyl(0.9, 1.0, 1.0, P.main, 0, 2.3, 0, 32));
  const dome = shadow(new THREE.Mesh(new THREE.SphereGeometry(0.95, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), M(P.roof))); dome.position.y = 2.8; g.add(dome);
  g.add(cyl(0.035, 0.035, 0.7, P.trim, 0, 3.9, 0, 8));
  g.add(sph(0.1, P.accent, 0, 4.28, 0));
  const ring = shadow(new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.04, 8, 48), M(P.accent))); ring.rotation.set(Math.PI / 2.6, 0, 0.35); ring.position.y = 3.1; g.add(ring);
  g.add(sph(0.13, P.accent, 1.07, 3.38, 0.45));
  for (let i = 0; i < 6; i++) { // 圍繞塔身的窗
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    const w = rbox(0.24, 0.34, 0.1, GLASS, Math.sin(a) * 1.29, 0.85, Math.cos(a) * 1.29); w.rotation.y = a; g.add(w);
  }
  g.add(rbox(0.6, 0.95, 0.14, P.door, 0, 0.78, 1.27));
  const d1 = rbox(0.5, 0.5, 0.5, P.trim, 1.85, 0.25, 0.75); d1.rotation.y = 0.5; g.add(d1);
  const d2 = rbox(0.4, 0.4, 0.4, P.accent, 2.05, 0.2, 0.15); d2.rotation.y = -0.3; g.add(d2);
  g.userData.height = 4.4;
  return g;
}

function museum(P) {
  const g = new THREE.Group();
  g.add(rbox(3.7, 0.16, 2.9, P.trim, 0, 0.08, 0.1));
  g.add(rbox(3.4, 0.16, 2.6, P.trim, 0, 0.24, 0.05));
  g.add(rbox(3.0, 1.55, 1.9, P.main, 0, 1.1, -0.2));
  for (let i = 0; i < 5; i++) g.add(cyl(0.11, 0.11, 1.55, P.trim, -1.2 + i * 0.6, 1.1, 1.0));
  g.add(rbox(3.2, 0.22, 0.6, P.trim, 0, 2.0, 0.95));
  const pg = new THREE.CylinderGeometry(1.7, 1.7, 2.5, 3); pg.rotateX(Math.PI / 2); pg.rotateZ(Math.PI);
  const ped = shadow(new THREE.Mesh(pg, M(P.roof))); ped.scale.y = 0.38; ped.position.set(0, 2.43, 0.05); g.add(ped);
  g.add(cyl(0.03, 0.03, 0.9, P.trim, 0, 3.2, 0.05, 8));
  g.add(rbox(0.5, 0.3, 0.04, P.accent, 0.27, 3.5, 0.05, 0.02));
  g.add(rbox(0.7, 1.1, 0.12, P.door, 0, 0.9, 0.72));
  for (const s of [-1, 1]) g.add(rbox(0.35, 0.8, 0.1, GLASS, s * 1.0, 1.15, 0.77));
  const vase = cyl(0.2, 0.28, 0.4, P.accent, 1.9, 0.2, 1.3, 16); g.add(vase); g.add(sph(0.2, P.accent, 1.9, 0.5, 1.3));
  g.userData.height = 3.9;
  return g;
}

function lab(P) {
  const g = new THREE.Group();
  g.add(rbox(2.7, 1.5, 2.2, P.main, -0.35, 0.8, 0));
  g.add(rbox(2.95, 0.18, 2.45, P.roof, -0.35, 1.64, 0));
  g.add(rbox(0.7, 1.0, 0.12, P.door, -0.35, 0.55, 1.12));
  for (const x of [-1.2, 0.5]) g.add(rbox(0.5, 0.5, 0.1, GLASS, x, 1.0, 1.12));
  g.add(cyl(1.0, 1.05, 0.15, P.trim, 1.45, 0.08, 0.35, 28));
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.95, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2), M(GLASS, { transparent: true, opacity: 0.6, roughness: 0.2 }));
  dome.position.set(1.45, 0.15, 0.35); dome.castShadow = true; g.add(dome);
  g.add(sph(0.2, P.accent, 1.45, 0.4, 0.35)); g.add(cyl(0.04, 0.04, 0.3, P.roof, 1.45, 0.25, 0.35, 8));
  g.add(sph(0.4, P.accent, -0.9, 2.05, 0.1, { transparent: true, opacity: 0.92 }));
  g.add(cyl(0.13, 0.13, 0.55, GLASS, -0.9, 2.55, 0.1, 16));
  const lip = shadow(new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.04, 8, 16), M(P.trim))); lip.rotation.x = Math.PI / 2; lip.position.set(-0.9, 2.84, 0.1); g.add(lip);
  g.add(sph(0.08, GLASS, -0.8, 3.1, 0.1)); g.add(sph(0.06, GLASS, -1.0, 3.3, 0.05));
  g.add(rbox(0.38, 0.9, 0.38, P.roof, 0.3, 2.2, -0.6));
  g.add(sph(0.22, 0xffffff, 0.3, 2.85, -0.6, { transparent: true, opacity: 0.8 }));
  g.add(sph(0.16, 0xffffff, 0.45, 3.2, -0.55, { transparent: true, opacity: 0.7 }));
  g.userData.height = 3.5;
  return g;
}

function signBoard() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128;
  const x = c.getContext('2d');
  x.fillStyle = '#fff3d6'; x.fillRect(0, 0, 256, 128);
  x.strokeStyle = '#e0a23a'; x.lineWidth = 10; x.strokeRect(5, 5, 246, 118);
  x.fillStyle = '#7a5a2a'; x.font = 'bold 54px "Noto Sans TC","Microsoft JhengHei",sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText('準備中', 128, 68);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const g = new THREE.Group();
  g.add(cyl(0.05, 0.05, 0.9, 0x9c7a55, 0, 0.45, 0, 8));
  const board = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.5, 0.06), [M(0xe9d9b4), M(0xe9d9b4), M(0xe9d9b4), M(0xe9d9b4), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }), M(0xe9d9b4)]);
  board.position.y = 1.0; board.castShadow = true; g.add(board);
  for (const [x2, z2] of [[-0.7, 0.3], [0.8, 0.2]]) { const cone = shadow(new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.4, 14), M(0xff9a4d))); cone.position.set(x2, 0.2, z2); g.add(cone); }
  return g;
}

const BUILDERS = { library, institute, museum, lab };

/* 回傳 Group；userData.height 為建築高度（供標籤定位用） */
export function createBuilding(type, { soon = false } = {}) {
  const P = soon ? SOON : PAL[type];
  const g = BUILDERS[type](P);
  const h = g.userData.height;
  if (soon) { const s = signBoard(); s.position.set(1.5, 0, 2.0); g.add(s); }
  const pick = new THREE.Mesh(new THREE.BoxGeometry(3.6, h, 3.2), new THREE.MeshBasicMaterial({ visible: false }));
  pick.position.y = h / 2; g.add(pick);
  g.userData.height = h;
  return g;
}
