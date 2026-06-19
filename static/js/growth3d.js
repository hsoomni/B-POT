/* ── B-POT 결과 전환: 고목나무에 키워드 3D 아이콘이 주렁주렁 자라남 ────────────
 * 답변·컬러를 3D 오브제(망원경/레몬/전구/별/하트/나침반/잎/로켓…)로 매핑해
 * 나무 가지에 매달려 차례로 맺힌다. */
window.BPOT = window.BPOT || {};

// 답변 선택지/컬러 → 아이콘 이름
BPOT.ICON_MAP = {
  "호기심 많은": "telescope", "시선": "telescope", "새로움": "telescope",
  "다정한": "heart", "공감력": "heart", "따뜻함": "heart", "위로": "heart",
  "추진력": "rocket", "대담함": "rocket",
  "길잡이": "compass", "조용한 안내자": "compass",
  "첫 햇살": "sun", "활기참": "sun",
  "끊임없는 실험가": "bulb", "영감": "bulb", "끊임없는 실험실": "bulb",
  "신뢰받는 전문가": "star", "자유로운 창작자": "star", "정직함": "star",
  "용기": "flag", "선언": "flag",
  "꾸준한": "leaf", "성장": "leaf", "지속가능성": "leaf",
  "창의력": "bulb", "집중력": "telescope", "도전": "rocket", "배려": "heart",
  "유쾌한": "sun", "섬세한": "heart", "열정적인 코치": "rocket", "감성적인": "heart",
  "산뜻함": "leaf", "단단한 뿌리": "leaf", "길잡이 등대": "compass", "혁신": "bulb",
};

BPOT.COLOR_HEX = [["오렌지","#F2A20C"],["주황","#F2A20C"],["코랄","#E8552D"],["레드","#E24B4A"],["빨강","#E24B4A"],["옐로","#F2B90F"],["노랑","#F2B90F"],["골드","#E0A91B"],["올리브","#7D8C3F"],["민트","#5DC9A8"],["그린","#5DAA3C"],["초록","#5DAA3C"],["틸","#3FA9A0"],["청록","#3FA9A0"],["네이비","#2C4A6E"],["남색","#2C4A6E"],["스카이","#5AAEE0"],["하늘","#5AAEE0"],["블루","#378ADD"],["파랑","#378ADD"],["퍼플","#8A6FE0"],["보라","#8A6FE0"],["핑크","#E8557D"],["분홍","#E8557D"],["베이지","#C9A876"],["브라운","#8A5A33"],["갈색","#8A5A33"]];
BPOT.colorHex = function (cat) {
  var t = (cat || "").trim();
  for (var i = 0; i < BPOT.COLOR_HEX.length; i++) { if (t.indexOf(BPOT.COLOR_HEX[i][0]) >= 0) return BPOT.COLOR_HEX[i][1]; }
  return null;
};

BPOT.resultIcons = function (answers, category) {
  var names = [];
  (answers || []).forEach(function (a) {
    var cs = (a && a.choices) ? a.choices : (a && a.choice ? [a.choice] : []);
    cs.forEach(function (ch) { if (BPOT.ICON_MAP[ch]) names.push(BPOT.ICON_MAP[ch]); });
  });
  names = names.filter(function (v, i) { return names.indexOf(v) === i; }).slice(0, 4);
  return names;
};

BPOT.mountGrowingPot = function (el, opts) {
  if (!window.THREE || !el) return function () {};
  opts = opts || {};
  var THREE = window.THREE;
  var W = el.clientWidth || 256, H = el.clientHeight || 300;

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(36, W / H, 0.1, 100);
  camera.position.set(0, 3.2, 13.8);
  camera.lookAt(0, 2.05, 0);

  var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(W, H);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  el.appendChild(renderer.domElement);

  scene.add(new THREE.AmbientLight(0xffffff, 0.65));
  var key = new THREE.DirectionalLight(0xffffff, 1.05); key.position.set(3, 6, 5); scene.add(key);
  var fill = new THREE.DirectionalLight(0xfff1e8, 0.3); fill.position.set(-5, 2, 2); scene.add(fill);
  var back = new THREE.DirectionalLight(0xffffff, 0.18); back.position.set(0, -2, -5); scene.add(back);

  function M(c, r) { return new THREE.MeshStandardMaterial({ color: c, roughness: r == null ? 0.6 : r }); }

  // ── 화분(테라코타 + 얼굴) ──
  var terra = M(0xc65e33, 0.85), terraD = M(0xa64b28, 0.88), soilMat = M(0x3a1e0a, 0.98), faceMat = M(0x1a0e06, 0.6);
  var V2 = function (x, y) { return new THREE.Vector2(x, y); };
  var bodyPts = [V2(0,-0.72),V2(0.64,-0.72),V2(0.72,-0.60),V2(0.86,0.10),V2(0.90,0.62),
    V2(0.86,0.92),V2(0.82,1.08),V2(0.86,1.20),V2(1.08,1.30),V2(1.14,1.44),V2(1.10,1.58),V2(0.96,1.64),V2(0.88,1.64)];
  var potMesh = new THREE.Mesh(new THREE.LatheGeometry(bodyPts, 80), terra);
  var soilDisk = new THREE.Mesh(new THREE.CircleGeometry(0.84, 64), soilMat); soilDisk.rotation.x = -Math.PI/2; soilDisk.position.y = 1.62;
  var botDisk = new THREE.Mesh(new THREE.CircleGeometry(0.64, 64), terraD); botDisk.rotation.x = Math.PI/2; botDisk.position.y = -0.72;
  var saucerPts = [V2(0,-1.04),V2(1.08,-1.04),V2(1.18,-0.96),V2(1.22,-0.84),V2(1.14,-0.76),V2(0.80,-0.74),V2(0.70,-0.72)];
  var saucer = new THREE.Mesh(new THREE.LatheGeometry(saucerPts, 80), terraD);
  var saucerBot = new THREE.Mesh(new THREE.CircleGeometry(1.08, 64), terraD); saucerBot.rotation.x = Math.PI/2; saucerBot.position.y = -1.04;
  var eyeGeo = new THREE.SphereGeometry(0.075, 16, 12);
  var leftEye = new THREE.Mesh(eyeGeo, faceMat); leftEye.position.set(-0.27,0.44,0.845); leftEye.scale.set(1,1.15,0.55);
  var rightEye = new THREE.Mesh(eyeGeo, faceMat); rightEye.position.set(0.27,0.44,0.845); rightEye.scale.set(1,1.15,0.55);
  var smileCurve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(-0.24,0.16,0.86), new THREE.Vector3(0,0,0.91), new THREE.Vector3(0.24,0.16,0.86));
  var smile = new THREE.Mesh(new THREE.TubeGeometry(smileCurve, 24, 0.038, 8, false), faceMat);
  var pot = new THREE.Group();
  pot.add(potMesh, soilDisk, botDisk, saucer, saucerBot, leftEye, rightEye, smile);
  pot.scale.set(1.12, 1.0, 1.12); scene.add(pot);

  // ── 고목나무 (갈색 줄기 + 가지) ──
  var plant = new THREE.Group(); plant.position.y = 1.6; scene.add(plant);
  var barkMat = M(0x6e4a2a, 0.9), barkDark = M(0x553820, 0.92);
  var HS = 2.0;
  var trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.2, HS, 9), barkMat);
  trunk.geometry.translate(0, HS/2, 0); plant.add(trunk);
  var branches = [];
  function branch(atY, ang, len, r) {
    var b = new THREE.Mesh(new THREE.CylinderGeometry(r*0.55, r, len, 7), barkDark);
    b.geometry.translate(0, len/2, 0);
    b.position.y = atY; b.rotation.z = ang;
    b.scale.setScalar(0.001); plant.add(b); branches.push(b);
    // 가지 끝 월드 좌표(매달 위치)
    return { x: Math.sin(-ang) * len, y: atY + Math.cos(ang) * len };
  }
  var tips = [];
  tips.push(branch(HS*0.42, 1.05, 1.05, 0.07));
  tips.push(branch(HS*0.50, -1.08, 1.08, 0.07));
  tips.push(branch(HS*0.66, 0.78, 0.98, 0.06));
  tips.push(branch(HS*0.74, -0.80, 0.98, 0.06));
  tips.push(branch(HS*0.90, 0.28, 0.72, 0.05));
  tips.push(branch(HS*0.92, -0.32, 0.72, 0.05));

  // 잎 몇 장
  var leafMat = M(0x5DAA3C, 0.7), leafGeo = new THREE.SphereGeometry(0.18, 14, 10);
  var leaves = [];
  [[-0.5,HS*0.7,0.7],[0.55,HS*0.74,-0.7],[-0.3,HS*0.95,0.5],[0.32,HS*0.98,-0.5],[0,HS*1.08,0.4]].forEach(function(L){
    var lf=new THREE.Mesh(leafGeo,leafMat); lf.position.set(L[0],L[1],0.05); lf.scale.set(1.5,0.45,0.9); lf.rotation.z=L[2]; lf.scale.multiplyScalar(0.001); plant.add(lf); leaves.push({m:lf,base:1});
  });

  // ── 아이콘 빌더들 ──
  function telescope() {
    var g = new THREE.Group();
    var body = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 0.42, 14), M(0x37475a, 0.5));
    var eye = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.09, 0.1, 14), M(0xC9A23A, 0.45));
    eye.position.y = -0.24; var lens = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.06, 14), M(0xC9A23A, 0.45)); lens.position.y = 0.22;
    g.add(body, eye, lens); g.rotation.z = 0.7; g.rotation.x = 0.2; return g;
  }
  function lemon(c) {
    var g = new THREE.Group();
    var b = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 14), M(c || 0xF2C20A, 0.5)); b.scale.set(1, 1.35, 1);
    var nub = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.08, 8), M(c || 0xF2C20A, 0.5)); nub.position.y = 0.24;
    var lf = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), leafMat); lf.position.set(0.09, 0.22, 0); lf.scale.set(1.4, 0.4, 0.8); lf.rotation.z = -0.6;
    g.add(b, nub, lf); return g;
  }
  function bulb() {
    var g = new THREE.Group();
    var glass = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 14), M(0xFFE9A8, 0.35)); glass.scale.set(1, 1.1, 1);
    var base = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.12, 12), M(0x9a9a9a, 0.5)); base.position.y = -0.18;
    g.add(glass, base); return g;
  }
  function star(c) {
    var sh = new THREE.Shape();
    for (var i = 0; i < 10; i++) { var r = i % 2 ? 0.1 : 0.22; var a = i / 10 * Math.PI * 2 - Math.PI / 2; var x = Math.cos(a) * r, y = Math.sin(a) * r; i === 0 ? sh.moveTo(x, y) : sh.lineTo(x, y); }
    sh.closePath();
    var geo = new THREE.ExtrudeGeometry(sh, { depth: 0.06, bevelEnabled: false }); geo.center();
    return new THREE.Mesh(geo, M(c || 0xF2B90F, 0.45));
  }
  function heart(c) {
    var g = new THREE.Group(); var m = M(c || 0xE8557D, 0.5);
    var s1 = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 12), m); s1.position.set(-0.07, 0.07, 0);
    var s2 = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 12), m); s2.position.set(0.07, 0.07, 0);
    var cone = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.22, 16), m); cone.position.set(0, -0.08, 0); cone.rotation.z = Math.PI;
    g.add(s1, s2, cone); return g;
  }
  function compass() {
    var g = new THREE.Group();
    var disc = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.05, 20), M(0xF2EFE6, 0.5)); disc.rotation.x = Math.PI / 2;
    var ring = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.025, 10, 24), M(0x37475a, 0.5));
    var needle = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.24, 0.02), M(0xE24B4A, 0.5)); needle.position.z = 0.04; needle.rotation.z = 0.5;
    g.add(disc, ring, needle); return g;
  }
  function rocket(c) {
    var g = new THREE.Group();
    var body = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.34, 14), M(0xEDEDED, 0.4));
    var nose = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.16, 14), M(c || 0xE24B4A, 0.45)); nose.position.y = 0.25;
    var fin1 = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.12, 4), M(c || 0xE24B4A, 0.45)); fin1.position.set(-0.1, -0.16, 0); fin1.rotation.z = 0.5;
    var fin2 = fin1.clone(); fin2.position.x = 0.1; fin2.rotation.z = -0.5;
    g.add(body, nose, fin1, fin2); g.rotation.z = 0.15; return g;
  }
  function sun(c) {
    var g = new THREE.Group(); var col = c || 0xF2A20C;
    var core = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 14), M(col, 0.45));
    for (var i = 0; i < 8; i++) { var a = i / 8 * Math.PI * 2; var ray = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.12, 6), M(col, 0.45)); ray.position.set(Math.cos(a) * 0.22, Math.sin(a) * 0.22, 0); ray.rotation.z = a - Math.PI / 2; g.add(ray); }
    g.add(core); return g;
  }
  function flag(c) {
    var g = new THREE.Group();
    var pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.42, 8), M(0x8a8a8a, 0.5));
    var cloth = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 0.02), M(c || 0xE24B4A, 0.5)); cloth.position.set(0.13, 0.12, 0);
    g.add(pole, cloth); return g;
  }
  function fruit(c) {
    var g = new THREE.Group();
    var b = new THREE.Mesh(new THREE.SphereGeometry(0.15, 14, 12), M(c, 0.5)); b.scale.set(0.92, 1.1, 0.92);
    var st = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.07, 6), barkDark); st.position.y = 0.16;
    g.add(b, st); return g;
  }

  var SEEDC = [0xE8552D, 0xF2A20C, 0xF2B90F, 0x5DAA3C, 0x3FA9A0, 0xE8557D];
  var accentHex = opts.accent || null;

  function buildIcon(name, idx) {
    if (name === "telescope") return telescope();
    if (name === "lemon") return lemon(accentHex);
    if (name === "bulb") return bulb();
    if (name === "star") return star();
    if (name === "heart") return heart();
    if (name === "compass") return compass();
    if (name === "rocket") return rocket();
    if (name === "sun") return sun();
    if (name === "flag") return flag();
    return fruit(SEEDC[idx % SEEDC.length]);
  }

  // 매달 아이콘 목록: 의미 아이콘 + (컬러 레몬) + 채움 과일
  var iconNames = (opts.icons || []).slice(0, 4);
  if (accentHex) iconNames.push("lemon");
  // 가지 끝마다 1개씩 + 상단 중앙 1개 (서로 넉넉히 분리)
  var hangs = tips.map(function (tp) { return [tp.x, tp.y]; });
  hangs.push([0, HS*1.2]);

  var ICON_SCALE = 1.75;
  var items = [];
  hangs.forEach(function (h, i) {
    var name = iconNames[i] || null;
    var g = buildIcon(name, i);
    g.position.set(h[0], h[1] - 0.28, (i % 3 - 1) * 0.16);
    g.scale.setScalar(0.001);
    plant.add(g);
    items.push({ g: g, t0: 0.9 + (h[1] / HS) * 1.4 + (i % 4) * 0.1, sc: ICON_SCALE });
  });

  var raf, alive = true, last = performance.now(), t = 0;
  function ease(x) { return 1 - Math.pow(1 - x, 3); }
  function c01(x) { return Math.max(0, Math.min(1, x)); }
  function loop(now) {
    if (!alive) return;
    raf = requestAnimationFrame(loop);
    var dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
    var g = ease(c01(t / 1.9));
    trunk.scale.y = Math.max(0.001, g);
    var bs = ease(c01((t - 0.7) / 0.5));
    branches.forEach(function (b) { b.scale.setScalar(bs); });
    var lvs = ease(c01((t - 0.9) / 0.5));
    leaves.forEach(function (L) { L.m.scale.set(1.5 * lvs, 0.45 * lvs, 0.9 * lvs); });
    items.forEach(function (it, i) {
      var s = ease(c01((t - it.t0) / 0.5));
      it.g.scale.setScalar(s * it.sc);
      it.g.rotation.z = Math.sin(t * 1.5 + i) * 0.04 * c01(t - it.t0);  // 매달려 흔들
    });
    var grown = c01(t - 2.0);
    plant.rotation.z = Math.sin(t * 1.1) * 0.025 * grown;
    pot.rotation.y = Math.sin(t * 0.5) * 0.07;
    renderer.render(scene, camera);
  }
  requestAnimationFrame(loop);

  function onResize() { var w = el.clientWidth, h = el.clientHeight; if (!w || !h) return; camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h); }
  window.addEventListener("resize", onResize);

  return function () {
    alive = false; cancelAnimationFrame(raf);
    window.removeEventListener("resize", onResize);
    renderer.dispose();
    if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
  };
};
