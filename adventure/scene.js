/* Three.js 場景：渲染器、相機、光線、海洋、天空、雲朵、渲染迴圈 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

function skyTexture() {
  const c = document.createElement('canvas'); c.width = 4; c.height = 256;
  const x = c.getContext('2d'); const g = x.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, '#a9d8f5'); g.addColorStop(0.55, '#d9eef9'); g.addColorStop(1, '#fde9e1');
  x.fillStyle = g; x.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

function makeCloud(mat, seed) {
  const g = new THREE.Group();
  const parts = [[0, 0, 0, 1.5], [1.4, -0.2, 0.2, 1.1], [-1.4, -0.25, -0.1, 1.15], [0.5, 0.5, -0.3, 1.0]];
  parts.forEach(([x, y, z, r]) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), mat); m.position.set(x, y, z); g.add(m); });
  g.scale.setScalar(0.9 + (seed % 5) * 0.18); return g;
}

export function createWorld(canvas, container, { mobile = false, reduced = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !mobile, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = mobile ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = skyTexture();
  scene.fog = new THREE.Fog(0xdcecf6, 110, 260);

  const camera = new THREE.PerspectiveCamera(40, 1, 0.5, 500);
  camera.position.set(0, 24, 38);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = !reduced; controls.dampingFactor = 0.08;
  controls.minDistance = 6; controls.maxDistance = 170;
  controls.minPolarAngle = 0.12; controls.maxPolarAngle = 1.48;
  controls.screenSpacePanning = false; controls.panSpeed = 0.8;
  controls.target.set(0, 1, 0);
  const PAN = new THREE.Box3(new THREE.Vector3(-30, 0, -16), new THREE.Vector3(30, 6, 16));
  controls.addEventListener('change', () => controls.target.clamp(PAN.min, PAN.max));

  // 光線
  scene.add(new THREE.HemisphereLight(0xffffff, 0xbcd8c6, 1.25));
  const sun = new THREE.DirectionalLight(0xfff0d8, 2.1); sun.position.set(22, 38, 24);
  sun.castShadow = true; const ss = mobile ? 1024 : 2048; sun.shadow.mapSize.set(ss, ss);
  Object.assign(sun.shadow.camera, { left: -36, right: 36, top: 24, bottom: -24, near: 5, far: 110 });
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04; scene.add(sun);

  // 海洋
  const seaGeo = new THREE.PlaneGeometry(260, 260, mobile ? 28 : 44, mobile ? 28 : 44); seaGeo.rotateX(-Math.PI / 2);
  const sea = new THREE.Mesh(seaGeo, new THREE.MeshStandardMaterial({ color: 0x86d4e8, roughness: 0.4, metalness: 0 }));
  sea.position.y = 0.1; sea.receiveShadow = true; scene.add(sea);
  const seaPos = seaGeo.attributes.position, seaBase = Float32Array.from(seaPos.array);

  // 雲
  const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, transparent: true, opacity: 0.95 });
  const clouds = [];
  for (let i = 0; i < (mobile ? 6 : 10); i++) {
    const c = makeCloud(cloudMat, i);
    c.position.set(-60 + i * 13 + (i % 3) * 3, 14 + (i % 4) * 3, -26 + ((i * 7) % 5) * 12 - 6);
    c.userData.speed = 0.25 + (i % 3) * 0.12; scene.add(c); clouds.push(c);
  }

  // 尺寸（ResizeObserver）
  const shift = { x: 0, y: 0 }; let W = 1, H = 1;
  function applyShift() {
    if (shift.x || shift.y) camera.setViewOffset(W, H, shift.x, shift.y, W, H); else camera.clearViewOffset();
  }
  function resize() {
    W = Math.max(1, container.clientWidth); H = Math.max(1, container.clientHeight);
    renderer.setSize(W, H, false); camera.aspect = W / H; camera.updateProjectionMatrix(); applyShift();
  }
  const ro = new ResizeObserver(resize); ro.observe(container); resize();

  const updaters = []; const clock = new THREE.Clock(); let frame = 0;
  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.1), t = clock.elapsedTime; frame++;
    if (!reduced) {
      if (frame % 2 === 0) {
        for (let i = 0; i < seaPos.count; i++) {
          const x = seaBase[i * 3], z = seaBase[i * 3 + 2];
          seaPos.setY(i, Math.sin(x * 0.22 + t * 0.9) * 0.07 + Math.cos(z * 0.2 + t * 0.7) * 0.07);
        }
        seaPos.needsUpdate = true;
      }
      clouds.forEach((c) => { c.position.x += c.userData.speed * dt; if (c.position.x > 75) c.position.x = -75; });
    }
    updaters.forEach((f) => f(dt, t));
    controls.update();
    renderer.render(scene, camera);
  });

  return {
    renderer, scene, camera, controls, canvas, container,
    get size() { return { w: W, h: H }; },
    setShift(x, y) { if (shift.x !== x || shift.y !== y) { shift.x = x; shift.y = y; applyShift(); } },
    get shift() { return shift; },
    onUpdate(f) { updaters.push(f); },
    dispose() { ro.disconnect(); renderer.setAnimationLoop(null); renderer.dispose(); },
  };
}
