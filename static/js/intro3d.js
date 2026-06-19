/* ── B-POT 인트로 3D: 빈 테라코타 화분 + 형형색색 씨앗 심기 모션 ───────────────
 * - 새싹 없음(빈 화분). 흙만 보임. 레퍼런스 테라코타 색, 가로로 넓은 화분.
 * - 위에서 다양한 색·모양의 3D 씨앗이 떨어져 흙 위에 잠시 쌓였다가 천천히 심긴다. */
window.BPOT = window.BPOT || {};

BPOT.mountPot = function (el) {
  if (!window.THREE || !el) return function () {};
  var THREE = window.THREE;

  var W = el.clientWidth || 320;
  var H = el.clientHeight || 320;

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(36, W / H, 0.1, 100);
  camera.position.set(0, 1.7, 9.4);
  camera.lookAt(0, 1.0, 0);

  var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(W, H);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  el.appendChild(renderer.domElement);

  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  var key = new THREE.DirectionalLight(0xffffff, 1.15); key.position.set(3, 6, 5); scene.add(key);
  var fill = new THREE.DirectionalLight(0xfff1e8, 0.28); fill.position.set(-5, 2, 2); scene.add(fill);
  var back = new THREE.DirectionalLight(0xffffff, 0.18); back.position.set(0, -2, -5); scene.add(back);

  // 레퍼런스 테라코타 색
  var terracotta = new THREE.MeshStandardMaterial({ color: 0xc65e33, roughness: 0.85 });
  var terracottaDark = new THREE.MeshStandardMaterial({ color: 0xa64b28, roughness: 0.88 });
  var soilMat = new THREE.MeshStandardMaterial({ color: 0x3a1e0a, roughness: 0.98 });
  var faceMat = new THREE.MeshStandardMaterial({ color: 0x1a0e06, roughness: 0.6 });

  var V2 = function (x, y) { return new THREE.Vector2(x, y); };
  var bodyPts = [V2(0,-0.72),V2(0.64,-0.72),V2(0.72,-0.60),V2(0.86,0.10),V2(0.90,0.62),
    V2(0.86,0.92),V2(0.82,1.08),V2(0.86,1.20),V2(1.08,1.30),V2(1.14,1.44),
    V2(1.10,1.58),V2(0.96,1.64),V2(0.88,1.64)];
  var potMesh = new THREE.Mesh(new THREE.LatheGeometry(bodyPts, 80), terracotta);

  var innerPts = [V2(0,1.64),V2(0.84,1.64),V2(0.82,0.90),V2(0.72,0.00),V2(0.62,-0.60)];
  var innerMesh = new THREE.Mesh(new THREE.LatheGeometry(innerPts, 80),
    new THREE.MeshStandardMaterial({ color: 0x4a220c, roughness: 0.96, side: THREE.BackSide }));

  var soilDisk = new THREE.Mesh(new THREE.CircleGeometry(0.84, 64), soilMat);
  soilDisk.rotation.x = -Math.PI / 2; soilDisk.position.y = 1.62;
  var botDisk = new THREE.Mesh(new THREE.CircleGeometry(0.64, 64), terracottaDark);
  botDisk.rotation.x = Math.PI / 2; botDisk.position.y = -0.72;

  var saucerPts = [V2(0,-1.04),V2(1.08,-1.04),V2(1.18,-0.96),V2(1.22,-0.84),
    V2(1.14,-0.76),V2(0.80,-0.74),V2(0.70,-0.72)];
  var saucerMesh = new THREE.Mesh(new THREE.LatheGeometry(saucerPts, 80), terracottaDark);
  var saucerBot = new THREE.Mesh(new THREE.CircleGeometry(1.08, 64), terracottaDark);
  saucerBot.rotation.x = Math.PI / 2; saucerBot.position.y = -1.04;

  var eyeGeo = new THREE.SphereGeometry(0.075, 16, 12);
  var leftEye = new THREE.Mesh(eyeGeo, faceMat);
  leftEye.position.set(-0.27, 0.44, 0.845); leftEye.scale.set(1, 1.15, 0.55);
  var rightEye = new THREE.Mesh(eyeGeo, faceMat);
  rightEye.position.set(0.27, 0.44, 0.845); rightEye.scale.set(1, 1.15, 0.55);
  var smileCurve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(-0.24, 0.16, 0.86),
    new THREE.Vector3(0.00, 0.00, 0.91),
    new THREE.Vector3(0.24, 0.16, 0.86));
  var smileMesh = new THREE.Mesh(new THREE.TubeGeometry(smileCurve, 24, 0.038, 8, false), faceMat);

  var pot = new THREE.Group();
  pot.add(potMesh, innerMesh, soilDisk, botDisk, saucerMesh, saucerBot, leftEye, rightEye, smileMesh);
  pot.scale.set(1.34, 1.1, 1.34);  // 중앙·크게 (카피 위로 겹침)
  scene.add(pot);

  // ── 자연스러운 3D 씨앗 (무광 클레이 — 화분 톤과 조화) ──────────────────────
  var SOIL_Y = 1.62, REST_Y = SOIL_Y + 0.16, GRAVITY = 6.6;

  function clay(c) { return new THREE.MeshStandardMaterial({ color: c, roughness: 0.72 }); }

  // 씨앗 = 본체 + 디테일(끝 뾰족/결/줄무늬/솔기)을 담은 그룹
  function makeSeed() {
    var g = new THREE.Group(), mats = [], geos = [];
    function add(mesh) { g.add(mesh); mats.push(mesh.material); geos.push(mesh.geometry); return mesh; }
    function body(col, sx, sy, sz) {
      var m = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 16), clay(col));
      m.scale.set(sx, sy, sz); return add(m);
    }
    function tip(col, y, r, h) {
      var m = new THREE.Mesh(new THREE.ConeGeometry(r, h, 14), clay(col));
      m.position.y = y; m.rotation.x = Math.PI; return add(m);
    }
    function line(col, x, z, w, hgt) {
      var m = new THREE.Mesh(new THREE.BoxGeometry(w, hgt, 0.02), clay(col));
      m.position.set(x, 0, z); return add(m);
    }

    var type = (Math.random() * 7) | 0;
    if (type === 0) {                 // 크림 호박씨 — 납작 물방울 + 뾰족 끝
      body(0xEFE3C6, 1.0, 1.35, 0.55); tip(0xEFE3C6, -0.27, 0.06, 0.16);
    } else if (type === 1) {          // 아몬드 — 뾰족 타원 + 결 라인
      body(0xD8B587, 0.95, 1.5, 0.5); tip(0xD8B587, -0.30, 0.05, 0.14);
      line(0xB9925F, -0.05, 0.105, 0.012, 0.30); line(0xB9925F, 0.05, 0.105, 0.012, 0.30);
    } else if (type === 2) {          // 해바라기씨 — 어두운 납작 + 크림 줄무늬
      body(0x2E2A26, 1.0, 1.45, 0.45); tip(0x2E2A26, -0.30, 0.055, 0.14);
      line(0xE8DEC2, -0.08, 0.095, 0.02, 0.36); line(0xE8DEC2, 0.0, 0.098, 0.02, 0.40); line(0xE8DEC2, 0.08, 0.095, 0.02, 0.36);
    } else if (type === 3) {          // 강낭콩 — 길쭉 타원 + 씨눈 자국
      body(0xB5402C, 1.55, 0.95, 0.9); line(0x7E2A1C, 0, 0.175, 0.10, 0.035);
    } else if (type === 4) {          // 골드 씨앗 — 타원 + 가운데 솔기
      body(0xE8B23C, 1.0, 1.3, 0.85); line(0xB07D1E, 0, 0.165, 0.016, 0.40);
    } else if (type === 5) {          // 초록 물방울 + 뾰족 끝
      body(0x7CB04A, 1.0, 1.3, 0.95); tip(0x7CB04A, -0.27, 0.06, 0.14);
    } else {                          // 둥근 알 (회색/갈색)
      var col = Math.random() < 0.5 ? 0x6E6A66 : 0x8A5A33;
      body(col, 1.0, 1.08, 1.0); tip(col, -0.20, 0.045, 0.10);
    }
    g.userData = { mats: mats, geos: geos };
    return g;
  }

  var seeds = [];
  var started = 0.35, spawnCooldown = 0.2;
  var blinkPhase = -1, BLINK_DUR = 0.16, blinkIdle = 2.0;   // 눈 깜박임(입 고정)

  function spawnSeed() {
    var g = makeSeed();
    var ang = Math.random() * Math.PI * 2, rad = Math.random() * 0.40;
    g.position.set(Math.cos(ang) * rad, 6.0 + Math.random() * 1.0, Math.sin(ang) * rad * 0.7);
    g.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
    scene.add(g);
    seeds.push({
      mesh: g, vy: 0,
      rot: new THREE.Vector3((Math.random() - 0.5) * 3.0, (Math.random() - 0.5) * 3.0, (Math.random() - 0.5) * 3.0),
      state: "fall", rest: 0, sink: 0, base: g.scale.clone(),
      mats: g.userData.mats, geos: g.userData.geos,
    });
  }

  function updateSeeds(dt) {
    // 공중에 떨어지는 중인 씨앗이 없을 때만 다음 씨앗 생성 → 한 번에 하나씩
    var falling = false;
    for (var j = 0; j < seeds.length; j++) { if (seeds[j].state === "fall") { falling = true; break; } }
    if (!falling) {
      spawnCooldown -= dt;
      if (spawnCooldown <= 0) { spawnSeed(); spawnCooldown = 0.65 + Math.random() * 0.5; }
    }

    for (var i = seeds.length - 1; i >= 0; i--) {
      var s = seeds[i], m = s.mesh;
      if (s.state === "fall") {
        s.vy -= GRAVITY * dt;
        m.position.y += s.vy * dt;
        m.rotation.x += s.rot.x * dt; m.rotation.y += s.rot.y * dt; m.rotation.z += s.rot.z * dt;
        if (m.position.y <= REST_Y) {
          m.position.y = REST_Y; s.state = "rest"; s.rest = 0;
          m.scale.set(s.base.x * 1.22, s.base.y * 0.74, s.base.z * 1.22); // 착지 스쿼시
          if (blinkPhase < 0) blinkPhase = 0; // 씨앗 들어올 때 눈 깜박
        }
      } else if (s.state === "rest") {
        s.rest += dt;
        var k = Math.min(1, s.rest / 0.18);
        m.scale.set(s.base.x * (1.22 - 0.22 * k), s.base.y * (0.74 + 0.26 * k), s.base.z * (1.22 - 0.22 * k));
        if (s.rest > 1.4) { s.state = "sink"; s.sink = 0; s.mats.forEach(function (mt) { mt.transparent = true; }); }
      } else {
        s.sink += dt;
        var p = Math.min(1, s.sink / 1.1);
        m.position.y = REST_Y - p * 0.30;
        s.mats.forEach(function (mt) { mt.opacity = 1 - p; });
        m.scale.multiplyScalar(1 - dt * 0.5);
        if (p >= 1) {
          scene.remove(m);
          s.geos.forEach(function (gg) { gg.dispose(); });
          s.mats.forEach(function (mt) { mt.dispose(); });
          seeds.splice(i, 1);
        }
      }
    }
  }

  var raf, alive = true, last = performance.now(), t = 0;
  function animate(now) {
    if (!alive) return;
    raf = requestAnimationFrame(animate);
    var dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
    pot.rotation.y = Math.sin(t * 0.5) * 0.13;
    pot.position.y = Math.sin(t * 0.8) * 0.04;

    // 눈 깜박임만 (입·화분 모양은 고정). 씨앗이 들어오거나 가끔 자동으로 깜박.
    blinkIdle -= dt;
    if (blinkIdle <= 0 && blinkPhase < 0) { blinkPhase = 0; blinkIdle = 2.4 + Math.random() * 2.8; }
    var closeAmt = 0;
    if (blinkPhase >= 0) {
      blinkPhase += dt;
      closeAmt = Math.sin((blinkPhase / BLINK_DUR) * Math.PI); // 감았다 → 뜨기
      if (blinkPhase >= BLINK_DUR) blinkPhase = -1;
    }
    var eyeY = 1.15 * (1 - 0.92 * closeAmt);
    leftEye.scale.set(1, eyeY, 0.55);
    rightEye.scale.set(1, eyeY, 0.55);

    if (t > started) updateSeeds(dt);
    renderer.render(scene, camera);
  }
  requestAnimationFrame(animate);

  function onResize() {
    var w = el.clientWidth, h = el.clientHeight;
    if (!w || !h) return;
    camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h);
  }
  window.addEventListener("resize", onResize);

  return function dispose() {
    alive = false;
    cancelAnimationFrame(raf);
    window.removeEventListener("resize", onResize);
    seeds.forEach(function (s) { scene.remove(s.mesh); });
    seeds = [];
    renderer.dispose();
    if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
  };
};
