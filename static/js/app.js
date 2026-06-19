/* ── B-POT 스텝 상태머신 (0~14) · 즉시 전환 · 새로고침 없음 ───────────────── */
(function () {
  // ?view=app → 어떤 기기에서도 앱(모바일) 레이아웃으로 강제
  if (/(?:^|[?&])view=app(?:&|$)/.test(location.search)) {
    document.documentElement.classList.add("view-app");
  }
  var BPOT = window.BPOT, el = BPOT.el;
  var root = document.getElementById("app");

  var ITEM_COLORS = { naming: "#E8552D", mission: "#F2A20C", core_value: "#F2B90F", concept: "#5DAA3C", persona: "#3FA9A0", communication: "#E8552D", originality: "#3FA9A0" };

  var PROGRESS_LABELS = {
    1: "SEED", 2: "기본 정보",
    3: "Q1 · NAMING", 4: "Q2 · NAMING", 5: "Q3 · MISSION", 6: "Q4 · MISSION",
    7: "Q5 · CORE VALUE", 8: "Q6 · CONCEPT", 9: "Q7 · CONCEPT",
    10: "Q8 · PERSONA", 11: "Q9 · PERSONA", 12: "Q10",
    13: "결과지", 14: "문의",
  };

  // ── 상태 ──
  var S = {
    step: 0,
    track: null,
    basicInfo: {},
    answers: [],       // [{id, choice, text}]
    result: null,      // {result_id, items, generated}
    submitting: false,
    generating: false, // 결과 생성 중(성장 화면)
    disposePot: null,
    disposeGrow: null,
  };

  function resetAll() {
    if (S.disposePot) { S.disposePot(); S.disposePot = null; }
    if (S.disposeGrow) { S.disposeGrow(); S.disposeGrow = null; }
    S.step = 0; S.track = null; S.basicInfo = {}; S.answers = [];
    S.result = null; S.submitting = false; S.generating = false;
  }

  function go(step) {
    if (S.disposePot && step !== 0) { S.disposePot(); S.disposePot = null; }
    S.step = step;
    render();
    window.scrollTo(0, 0);
  }

  // ── 네트워크 ──
  function postJSON(url, body) {
    return fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-CSRFToken": window.CSRF_TOKEN || "" },
      body: JSON.stringify(body),
    }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, data: j }; }); });
  }

  // ── 셸(헤더 + 진행바 + 메인) ──
  function render() {
    root.innerHTML = "";
    var vp = el("div", { class: "app-viewport" }, [renderHeader()]);
    vp.appendChild(el("main", { class: "main" }, [S.generating ? stepGrowing() : renderStep()]));
    root.appendChild(vp);
    root.appendChild(renderFooter());
  }

  function renderFooter() {
    function lnk(t, fn) {
      return el("a", { class: "footer-link", href: "#",
        onclick: function (e) { e.preventDefault(); if (fn) fn(); } }, [t]);
    }
    return el("footer", { class: "app-footer" }, [
      el("div", { class: "footer-links" }, [
        lnk("개인정보 처리방침"),
        el("span", { class: "footer-sep", text: "|" }),
        lnk("이용 약관"),
        el("span", { class: "footer-sep", text: "|" }),
        lnk("비즈니스 문의하기", function () { go(14); }),
      ]),
      el("p", { class: "footer-biz", text: "상호: (주)홍남기획  |  사업자등록번호: 507-86-04141" }),
      el("p", { class: "footer-copy", text: "© 2026 HONGNAM Inc. All rights reserved." }),
    ]);
  }

  function renderHeader() {
    var children = [
      el("button", {
        class: "brand-mark", type: "button",
        onclick: function () {
          if (S.step > 0 && !window.confirm("처음으로 돌아갈까요? 입력한 내용이 사라집니다.")) return;
          resetAll(); go(0);
        },
      }, ["B·POT"]),
    ];
    if (S.step >= 1 && S.step <= 12) {
      var pct = Math.round(((S.step - 1) / 13) * 100);
      children.push(el("div", { class: "navbar" }, [
        el("div", { class: "navbar-fill", style: "width:" + pct + "%" }),
      ]));
    }
    return el("header", { class: "app-header" }, children);
  }

  function renderProgress() {
    var TOTAL = 14;
    var pct = Math.round(((S.step - 1) / (TOTAL - 1)) * 100);
    return el("div", { class: "progress" }, [
      el("div", { class: "progress-row" }, [
        el("span", { class: "progress-label", text: PROGRESS_LABELS[S.step] || "" }),
      ]),
      el("div", { class: "progress-track" }, [
        el("div", { class: "progress-fill", style: "width:" + pct + "%" }),
      ]),
    ]);
  }

  // ── 스텝 라우팅 ──
  function renderStep() {
    if (S.step === 0) return stepIntro();
    if (S.step === 1) return stepTrack();
    if (S.step === 2) return stepBasic();
    if (S.step >= 3 && S.step <= 12) return stepQuestion(S.step - 3);
    if (S.step === 13) return BPOT.renderResult(
      { track: S.track, basicInfo: S.basicInfo, items: S.result.items, generated: S.result.generated, accent: S.result.accent },
      function () { go(14); });
    if (S.step === 14) return stepCTA();
    return el("div");
  }

  // ── 0. 인트로 ──
  function stepIntro() {
    var hero = el("div", { class: "intro-hero" }, [
      el("div", { class: "intro-canvas", id: "pot-canvas", "aria-label": "3D 테라코타 화분에 씨앗이 떨어지는 인트로" }),
      el("div", { class: "intro-hero-title" }, [
        el("p", { class: "eyebrow", text: "나의 첫 브랜드 씨앗 심기" }),
        el("h1", { class: "h1 h1--hero", text: "B·POT" }),
      ]),
    ]);
    var wrap = el("div", { class: "step step--intro fade-in" }, [
      hero,
      el("div", { class: "center-col intro-cta" }, [
        el("p", { class: "lead", html: "10개의 질문에 답하면<br><strong>나만의 브랜드</strong>가 싹을 틔워요" }),
        el("button", { class: "btn", type: "button", onclick: function () { go(1); } }, ["씨앗 심기"]),
      ]),
    ]);
    // 3D 마운트는 DOM 삽입 후
    setTimeout(function () {
      var c = document.getElementById("pot-canvas");
      if (c) S.disposePot = BPOT.mountPot(c);
    }, 0);
    return wrap;
  }

  // ── 1. 트랙 선택 ──
  function stepTrack() {
    var sel = S.track;
    var tracks = [
      { id: "brand", label: "브랜드", desc: "제품·브랜드의 아이덴티티 찾기", seed: "#E8552D", sub: "BRAND SEED" },
      { id: "personal", label: "개인", desc: "개인의 오리지널리티 찾기", seed: "#5DAA3C", sub: "PERSONAL SEED" },
    ];
    var nextBtn = el("button", { class: "btn", type: "button", disabled: !sel,
      onclick: function () { if (sel) { S.track = sel; S.answers = []; go(2); } } }, ["다음"]);

    var list = el("div", { class: "track-list" }, tracks.map(function (t) {
      return el("button", {
        class: "track-card" + (sel === t.id ? " is-selected" : ""), type: "button",
        onclick: function () { sel = t.id; S.track = t.id; render(); },
      }, [
        el("div", { class: "track-card__top" }, [
          el("span", { class: "dot", style: "background:" + t.seed }),
          el("span", { class: "track-card__label", text: t.label }),
          el("span", { class: "track-card__sub", text: t.sub }),
        ]),
        el("p", { class: "track-card__desc", text: t.desc }),
      ]);
    }));

    return el("div", { class: "step step--form fade-in" }, [
      el("div", { class: "step-center" }, [
        el("div", {}, [
          el("p", { class: "eyebrow", text: "Step 01" }),
          el("h2", { class: "h2", text: "어떤 씨앗을 심을까요?" }),
        ]),
        list,
      ]),
      el("div", { class: "step-foot" }, [nextBtn]),
    ]);
  }

  // ── 2. 기본 정보 ──
  function stepBasic() {
    var isBrand = S.track === "brand";
    var fields = isBrand
      ? [{ key: "name", label: "브랜드명 (또는 후보)", ph: "예: 오늘의 집" },
         { key: "category", label: "카테고리 / 업종", ph: "예: 인테리어 플랫폼" },
         { key: "target", label: "주요 타깃", ph: "예: 20~30대 직장인" }]
      : [{ key: "name", label: "이름 또는 활동명", ph: "예: 김수연" },
         { key: "category", label: "좋아하는 컬러", ph: "예: 코랄, 네이비, 올리브" },
         { key: "target", label: "자주 듣는 말", ph: "예: 듬직하다, 차분하다" }];

    var form = el("div", { class: "form" }, fields.map(function (f) {
      return el("div", {}, [
        el("label", { class: "field-label", text: f.label }),
        el("input", {
          class: "input", type: "text", value: S.basicInfo[f.key] || "", placeholder: f.ph,
          oninput: function (e) { S.basicInfo[f.key] = e.target.value; },
        }),
      ]);
    }).concat([
      el("div", { class: "notice" }, [
        el("p", { text: "주민등록번호, 연락처, 주소 등 중요한 개인정보가 포함된 자료는 입력하지 말아주세요." }),
      ]),
    ]));

    return el("div", { class: "step step--form fade-in" }, [
      el("div", { class: "step-center" }, [
        el("div", {}, [
          el("p", { class: "eyebrow", text: "Step 02" }),
          el("h2", { class: "h2", text: "정보를 알려주세요" }),
        ]),
        form,
      ]),
      el("div", { class: "step-foot" }, [
        el("div", { class: "btn-row" }, [
          el("button", { class: "btn--ghost", type: "button", onclick: function () { go(1); } },
            [BPOT.icon("back"), " 이전"]),
          el("button", { class: "btn", type: "button", onclick: function () { go(3); } }, ["다음 ", BPOT.icon("forward")]),
        ]),
      ]),
    ]);
  }

  // ── 3~12. 질문 ──
  function stepQuestion(idx) {
    var questions = BPOT.getQuestions(S.track);
    var q = questions[idx];
    if (!q) return el("div");
    var ans = S.answers[idx] || { id: q.id, choices: [] };
    if (!ans.choices) ans.choices = [];
    S.answers[idx] = ans;
    var itemColor = ITEM_COLORS[q.item] || "#E8552D";
    var isLast = idx === questions.length - 1;

    function refresh() { root.querySelector(".main").replaceChild(stepQuestion(idx), root.querySelector(".step")); }

    var options = el("div", { class: "options" }, q.options.map(function (opt) {
      var on = ans.choices.indexOf(opt) >= 0;
      return el("button", {
        class: "option" + (on ? " is-selected" : ""), type: "button",
        onclick: function () {
          var i = ans.choices.indexOf(opt);
          if (i >= 0) ans.choices.splice(i, 1); else ans.choices.push(opt);
          refresh();
        },
      }, [opt]);
    }));

    var optionalInput = q.has_input ? el("div", { class: "optional-input" }, [
      el("label", { class: "field-label", text: "내 단어로 직접 적어주세요 · 최대 10글자 (선택)" }),
      el("input", {
        class: "input", type: "text", maxlength: "10", value: ans.text || "", placeholder: q.input_placeholder || "",
        oninput: function (e) { ans.text = e.target.value.slice(0, 10); },
      }),
    ]) : null;

    var nextLabel = S.generating ? "결과 생성 중…" : (isLast ? "결과 보기" : "다음");
    var nextBtn = el("button", {
      class: "btn", type: "button", disabled: ans.choices.length === 0 || S.generating,
      onclick: function () {
        if (ans.choices.length === 0) return;
        if (isLast) submitAnswers(); else go(S.step + 1);
      },
    }, S.generating ? [nextLabel] : [nextLabel + " ", BPOT.icon("forward")]);

    var dots = el("div", { class: "q-dots" }, questions.map(function (_q, di) {
      var cls = "q-dot" + (di < idx ? " done" : "");
      var st = di === idx ? "background:" + itemColor + ";transform:scale(1.5);" : "";
      return el("span", { class: cls + (di === idx ? " now" : ""), style: st });
    }));
    var centerChildren = [
      el("div", { class: "q-head" }, [
        dots,
        el("h2", { class: "q-prompt", text: q.prompt }),
        el("p", { class: "q-hint", text: "여러 개 선택할 수 있어요" }),
      ]),
      options,
    ];
    if (optionalInput) centerChildren.push(optionalInput);
    return el("div", { class: "step step--form fade-in" }, [
      el("div", { class: "step-center" }, centerChildren),
      el("div", { class: "step-foot" }, [
        el("div", { class: "btn-row" }, [
          el("button", { class: "btn--ghost", type: "button", onclick: function () { go(S.step - 1); } },
            [BPOT.icon("back"), " 이전"]),
          nextBtn,
        ]),
      ]),
    ]);
  }

  // ── 결과 생성 중: 자라나는 3D 화면 ──
  function stepGrowing() {
    if (S.disposeGrow) { S.disposeGrow(); S.disposeGrow = null; }
    var wrap = el("div", { class: "step fade-in" }, [
      el("div", { class: "grow-head" }, [
        el("p", { class: "grow-title", text: "심은 씨앗이 자라고 있어요" }),
        el("p", { class: "grow-sub loading-dots", text: "결과지를 만드는 중" }),
      ]),
      el("div", { class: "grow-stage", id: "grow-canvas", "aria-label": "키워드 아이콘이 자라나는 3D 화면" }),
    ]);
    setTimeout(function () {
      var c = document.getElementById("grow-canvas");
      if (c) {
        var icons = BPOT.resultIcons(S.answers, S.basicInfo && S.basicInfo.category);
        var accent = BPOT.colorHex(S.basicInfo && S.basicInfo.category);
        S.disposeGrow = BPOT.mountGrowingPot(c, { icons: icons, accent: accent });
      }
    }, 0);
    return wrap;
  }

  // ── 제출 → 백엔드 생성 → 결과 ──
  function submitAnswers() {
    if (S.generating) return;
    S.generating = true; render();   // 자라나는 3D 화면
    var payload = {
      track: S.track,
      basic_info: S.basicInfo,
      answers: S.answers.map(function (a) { return { id: a.id, choices: a.choices || [], text: a.text || "" }; }),
    };
    var minAnim = new Promise(function (r) { setTimeout(r, 2900); });
    var cleanup = function () { if (S.disposeGrow) { S.disposeGrow(); S.disposeGrow = null; } };
    Promise.all([postJSON("/api/submit", payload), minAnim]).then(function (arr) {
      var res = arr[0];
      S.generating = false;
      if (res.ok && res.data && res.data.ok) {
        S.result = { result_id: res.data.result_id, items: res.data.items, generated: res.data.generated, accent: res.data.accent };
        cleanup(); go(13);
      } else {
        cleanup();
        alert((res.data && res.data.error) || "결과 생성에 실패했습니다. 다시 시도해주세요.");
        render();
      }
    }).catch(function () {
      S.generating = false; cleanup();
      alert("네트워크 오류로 결과를 생성하지 못했습니다. 연결을 확인하고 다시 시도해주세요.");
      render();
    });
  }

  // ── 14. CTA ──
  function stepCTA() {
    var form = { type: "", company: "", manager: "", email: "" };
    var errorText = "";
    var done = false;

    function view() {
      if (done) {
        return el("div", { class: "step fade-in" }, [
          el("div", { class: "success-icon" }, [BPOT.icon("check")]),
          el("div", {}, [
            el("h2", { class: "h2", text: "문의가 접수되었습니다" }),
            el("p", { class: "lead", html: "검토 후 빠르게 연락드리겠습니다.<br>B-POT과 함께 브랜드 씨앗을 키워봐요." }),
          ]),
          el("button", { class: "btn--ghost", type: "button",
            onclick: function () { resetAll(); go(0); } }, ["처음으로"]),
        ]);
      }

      var types = [
        { id: "coffeechat", label: "커피챗" },
        { id: "campaign", label: "캠페인" },
        { id: "workshop", label: "워크숍" },
      ];
      var typeRow = el("div", { class: "cta-types" }, types.map(function (t) {
        return el("button", {
          class: "cta-type" + (form.type === t.id ? " is-selected" : ""), type: "button",
          onclick: function () { form.type = t.id; rerender(); },
        }, [t.label]);
      }));

      var inputs = [
        { key: "company", label: "회사 / 이름", ph: "예: 오늘의 집 / 김수연", type: "text" },
        { key: "manager", label: "담당자", ph: "예: 브랜드 팀 이지은", type: "text" },
        { key: "email", label: "이메일 *", ph: "예: brand@company.com", type: "email" },
      ].map(function (f) {
        return el("div", {}, [
          el("label", { class: "field-label", text: f.label }),
          el("input", { class: "input", type: f.type, value: form[f.key], placeholder: f.ph,
            oninput: function (e) { form[f.key] = e.target.value; errorText = ""; } }),
        ]);
      });

      var formChildren = [el("div", {}, [
        el("p", { class: "field-label", text: "문의 유형" }), typeRow,
      ])].concat(inputs);
      if (errorText) formChildren.push(el("p", { class: "error", text: errorText }));

      return el("div", { class: "step step--cta fade-in" }, [
        el("div", { class: "cta-intro" }, [
          el("h2", { class: "h2", text: "브랜드를 함께 키워볼까요?" }),
          el("p", { class: "cta-quote", text: "‘규모가 작을 순 있지만 꿈이 작은 브랜드는 없다’" }),
          el("p", { class: "cta-desc", text: "홍남기획은 브랜드의 매력을 발견하고 알리는 일을 합니다" }),
          el("p", { class: "cta-desc", text: "결과지를 토대로 브랜드의 시작점을 함께 합니다" }),
        ]),
        el("div", { class: "form" }, formChildren),
        el("button", { class: "btn", type: "button", onclick: submit }, [BPOT.icon("send"), " 문의 보내기"]),
      ]);
    }

    function rerender() {
      var cur = root.querySelector(".step");
      if (cur) cur.parentNode.replaceChild(view(), cur);
    }

    function submit() {
      if (!form.email) { errorText = "이메일을 입력해주세요."; rerender(); return; }
      postJSON("/api/inquiry", {
        inquiry_type: form.type, company: form.company, manager: form.manager,
        email: form.email, result_id: S.result ? S.result.result_id : null,
      }).then(function (res) {
        if (res.ok && res.data && res.data.ok) {
          var who = (form.company || "").trim() || "고객";
          BPOT.toast(who + "님, 담당자가 확인 후\n빠른 시일 내에 연락 드리겠습니다.\n감사합니다");
          done = true; rerender();
        }
        else { errorText = (res.data && res.data.error) || "문의 전송에 실패했습니다."; rerender(); }
      }).catch(function () { errorText = "네트워크 오류입니다. 다시 시도해주세요."; rerender(); });
    }

    return view();
  }

  // ── 시작 ──
  render();
})();
