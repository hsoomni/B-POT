// Lightweight 3D intro: a low-poly black pot with colorful illustrated seeds
// drifting down into it. Degrades silently if WebGL is unavailable.
import * as THREE from 'three';

const SEED_COLORS = [0xE8552D, 0xF2A20C, 0xF2B90F, 0x5DAA3C, 0x3FA9A0];

export function mountIntro(canvas) {
  if (!canvas) return;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  } catch (e) {
    return; // no WebGL; intro just shows the wordmark
  }
  const size = Math.min(canvas.clientWidth || 320, 320);
  renderer.setSize(size, size, false);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 1.2, 6);

  scene.add(new THREE.AmbientLight(0xffffff, 0.9));
  const dir = new THREE.DirectionalLight(0xffffff, 0.6);
  dir.position.set(3, 5, 4);
  scene.add(dir);

  const pot = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(1.0, 0.7, 1.2, 8),
    new THREE.MeshStandardMaterial({ color: 0x161616, flatShading: true }),
  );
  body.position.y = -0.6;
  pot.add(body);
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(1.0, 0.12, 6, 12),
    new THREE.MeshStandardMaterial({ color: 0x2b2b2b, flatShading: true }),
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0;
  pot.add(rim);
  scene.add(pot);

  const seeds = [];
  for (let i = 0; i < 5; i++) {
    const seed = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.22, 0),
      new THREE.MeshStandardMaterial({ color: SEED_COLORS[i], flatShading: true }),
    );
    seed.position.set((Math.sin(i) * 1.2), 2.5 + i * 0.6, Math.cos(i) * 0.4);
    seeds.push(seed);
    scene.add(seed);
  }

  let raf;
  const start = performance.now();
  function tick(now) {
    const t = (now - start) / 1000;
    pot.rotation.y = Math.sin(t * 0.4) * 0.3;
    seeds.forEach((s, i) => {
      s.position.y = ((2.5 + i * 0.6 - t * 0.7) % 3.2 + 3.2) % 3.2 - 0.6;
      s.rotation.x += 0.02; s.rotation.y += 0.03;
    });
    renderer.render(scene, camera);
    raf = requestAnimationFrame(tick);
  }
  raf = requestAnimationFrame(tick);

  const observer = new MutationObserver(() => {
    if (!document.body.contains(canvas)) { cancelAnimationFrame(raf); observer.disconnect(); renderer.dispose(); }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}
