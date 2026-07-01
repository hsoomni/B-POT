/* ── 결과 씨앗 봉투 렌더 + html2canvas PNG 저장 ─────────────────────────── */
window.BPOT = window.BPOT || {};

/* 결과지(스텝 13) 화면 구성.
 * state: { track, basicInfo, items[], generated{} }
 * onCTA: 문의하기 콜백 */
BPOT.renderResult = function (state, onCTA) {
  var el = BPOT.el, isBrand = state.track === "brand";
  var owner = (state.basicInfo && state.basicInfo.name) || (isBrand ? "내 브랜드" : "나");

  var packetItems = (state.items || []).map(function (it) {
    var g = (state.generated && state.generated[it.key]) || { head: "—", body: "—" };
    return el("div", { class: "packet__item" }, [
      el("div", { class: "packet__item-top" }, [
        el("span", { class: "dot", style: "background:#161616" }),
        el("span", { class: "packet__item-label", text: it.label }),
      ]),
      el("p", { class: "packet__item-head", text: g.head }),
      el("p", { class: "packet__item-body", text: g.body }),
    ]);
  });

  // 클립: 페이퍼와 배경 사이(뒤)에 끼워진 연출. PNG에는 미포함(seed-packet 밖 형제 요소).
  var clip = el("div", { class: "paper__clip", "aria-hidden": "true",
    html: '<svg width="24" height="50" viewBox="0 0 22 46" fill="none" stroke="#8a8f92" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M11 7 v26 a4.5 4.5 0 0 1 -9 0 V9 a7.5 7.5 0 0 1 15 0 v26 a10.5 10.5 0 0 1 -21 0 V11"/></svg>' });

  // 1page 텍스트 페이퍼 — 좌상단 이름만. (저장 캡처 대상 = 이 페이퍼만)
  var packet = el("div", { class: "packet paper", id: "seed-packet" }, [
    el("div", { class: "paper__head" }, [
      el("p", { class: "paper__name", text: owner }),
    ]),
    el("div", { class: "paper__rule" }),
    el("div", { class: "packet__items" }, packetItems),
  ]);

  var paperWrap = el("div", { class: "paper-wrap" }, [clip, packet]);

  var saveBtn = el("button", { class: "btn--ghost result-btn", type: "button",
    onclick: function () { BPOT.savePacketPNG(owner); } }, ["저장하기"]);
  var ctaBtn = el("button", { class: "btn result-btn", type: "button", onclick: onCTA }, ["문의하기"]);

  return el("div", { class: "step step--scroll fade-in" }, [
    paperWrap,
    el("div", { class: "result-actions" }, [
      el("div", { class: "result-cta" }, [
        saveBtn,
        el("p", { class: "result-note", text: "*소개 문구를 이어 읽으면 1분 자기소개가 됩니다" }),
      ]),
      el("div", { class: "result-cta" }, [
        ctaBtn,
        el("p", { class: "result-note", text: "*결과지를 토대로 함께 브랜드를 키워볼까요?" }),
      ]),
    ]),
  ]);
};

/* html2canvas 로 봉투만 PNG 저장 */
BPOT.savePacketPNG = function (owner) {
  var node = document.getElementById("seed-packet");
  if (!node || !window.html2canvas) return;
  window.html2canvas(node, { scale: 2, backgroundColor: "#ffffff", useCORS: true })
    .then(function (canvas) {
      var link = document.createElement("a");
      var safe = (owner || "b-pot").replace(/[^\w가-힣]/g, "_");
      link.download = "BPOT_" + safe + ".png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    })
    .catch(function (e) { console.warn("PNG 저장 실패:", e); });
};
