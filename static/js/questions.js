/* ── 공용 헬퍼 + 씨앗 SVG + 문항 데이터 접근 ─────────────────────────────── */
window.BPOT = window.BPOT || {};

BPOT.SEED_COLORS = ["#E8552D", "#F2A20C", "#F2B90F", "#5DAA3C", "#3FA9A0"];

/* 서버 주입 데이터 (문항 + 결과 항목 메타) */
BPOT.DATA = (function () {
  try { return JSON.parse(document.getElementById("bpot-data").textContent); }
  catch (e) { return { questions: {}, items: {} }; }
})();

BPOT.getQuestions = function (track) {
  return (BPOT.DATA.questions && BPOT.DATA.questions[track]) || [];
};

/* 색 어둡게 (발아 악센트 선) */
BPOT.darken = function (hex, amt) {
  amt = amt || 40;
  var n = parseInt(hex.replace("#", ""), 16);
  var r = Math.max(0, (n >> 16) - amt);
  var g = Math.max(0, ((n >> 8) & 0xff) - amt);
  var b = Math.max(0, (n & 0xff) - amt);
  return "#" + ((r << 16) | (g << 8) | b).toString(16).padStart(6, "0");
};

/* DOM 헬퍼: el("div", {class:"x"}, [children]) */
BPOT.el = function (tag, attrs, children) {
  var node = document.createElement(tag);
  attrs = attrs || {};
  Object.keys(attrs).forEach(function (k) {
    if (k === "class") node.className = attrs[k];
    else if (k === "html") node.innerHTML = attrs[k];
    else if (k === "text") node.textContent = attrs[k];
    else if (k.slice(0, 2) === "on" && typeof attrs[k] === "function")
      node.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
    else if (attrs[k] !== null && attrs[k] !== undefined && attrs[k] !== false)
      node.setAttribute(k, attrs[k]);
  });
  (children || []).forEach(function (c) {
    if (c == null) return;
    node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  });
  return node;
};

/* 컬러 씨앗 SVG (라인 발아 악센트 + 새싹) */
BPOT.miniSeed = function (color, size) {
  size = size || 20;
  var ns = "http://www.w3.org/2000/svg";
  var svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 24 30");
  svg.setAttribute("width", size);
  svg.setAttribute("height", Math.round(size * 1.25));
  svg.setAttribute("fill", "none");
  svg.setAttribute("aria-hidden", "true");
  svg.innerHTML =
    '<ellipse cx="12" cy="13" rx="7" ry="10" fill="' + color + '"/>' +
    '<path d="M7 10 Q12 3 17 10" stroke="' + BPOT.darken(color, 45) +
      '" stroke-width="1.5" fill="none" stroke-linecap="round"/>' +
    '<line x1="12" y1="23" x2="12" y2="29" stroke="#3d7a28" stroke-width="2.5" stroke-linecap="round"/>';
  return svg;
};

/* 작은 라인 아이콘(이전 화살표 / 보내기 / 체크) — 라인 아이콘만, 이모지 제외 */
BPOT.icon = function (name) {
  var ns = "http://www.w3.org/2000/svg";
  var svg = document.createElementNS(ns, "svg");
  svg.setAttribute("class", "icon");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  var paths = {
    back: '<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>',
    forward: '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>',
    send: '<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>',
    check: '<polyline points="20 6 9 17 4 12"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>'
  };
  svg.innerHTML = paths[name] || "";
  return svg;
};


/* 토스트 메시지 (하단 중앙, 자동 사라짐) */
BPOT.toast = function (msg) {
  var t = document.createElement("div");
  t.className = "toast";
  t.textContent = msg;
  document.body.appendChild(t);
  requestAnimationFrame(function () { t.classList.add("show"); });
  setTimeout(function () {
    t.classList.remove("show");
    setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 320);
  }, 4400);
};
