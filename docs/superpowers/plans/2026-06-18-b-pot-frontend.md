# B-POT Frontend (SPA) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the B-POT vanilla-JS single-page app served by Django: an instant-transition step machine (intro → track → basic info → 10 questions → result → CTA) that consumes the backend APIs, renders a vintage "seed packet" result, saves it as PNG, and submits CTA inquiries.

**Architecture:** Pure-logic ES modules (`state`, `payload`, `render`, `result`) hold all testable logic and return data/HTML strings; a thin `app.js` controller fetches questions, mounts rendered HTML into a single shell, and wires navigation/API calls. No build step, no framework. Three.js + html2canvas load from CDN. Design system per `b-pot-design-system` (sky blue `#D6EEF7`, colorful illustrated seeds, black POT `#161616`).

**Tech Stack:** Vanilla JS (ES modules), Django template + static files, Node's built-in test runner (`node --test`) for pure modules, Three.js (CDN) for the intro, html2canvas (CDN) for PNG export.

Reference spec: `docs/superpowers/specs/2026-06-18-b-pot-webapp-design.md`. Backend (Plan 1, branch `feat/backend`) provides `GET /api/questions/`, `POST /api/submit/`, `POST /api/inquiry/`. This branch (`feat/frontend`) is stacked on `feat/backend`.

---

## Data contracts (shared across tasks)

Client state object:
```js
{
  stepIndex: 0,                 // 0..14
  track: null,                  // 'brand' | 'personal'
  basicInfo: { name:'', category:'', target:'' },
  answers: [],                  // [{ qid, choice, text? }]
  result: null,                 // { result_id, generated }  after submit
}
```

Step order (15 steps, indices 0..14):
`['intro','track','basic', 'q0','q1','q2','q3','q4','q5','q6','q7','q8','q9', 'result','cta']`

`generated` (from backend) shape: `{ <item>: { label, head, body } }` for the 6 items of the track.

Questions (from `GET /api/questions/`): `{ brand:[...10], personal:[...10], result_items:{}, item_labels:{} }`. Each question: `{ id, item, prompt, options:[...], input?:bool }`.

---

## File Structure

- `static/js/state.js` — step machine: order, transitions, progress, per-step validity. Pure.
- `static/js/state.test.mjs` — node tests for state.
- `static/js/payload.js` — build submit/inquiry payloads; validate basic info & inquiry. Pure.
- `static/js/payload.test.mjs` — node tests for payload.
- `static/js/render.js` — pure HTML-string renderers for track / basic / question / cta / progress. Returns strings.
- `static/js/render.test.mjs` — node tests for render.
- `static/js/result.js` — pure HTML-string renderer for the seed-packet result from `generated`. Returns string.
- `static/js/result.test.mjs` — node tests for result.
- `static/css/app.css` — design system + shell + screens.
- `static/img/seeds.svg` — reusable seed SVG symbol defs (loaded inline into shell).
- `static/js/intro3d.js` — Three.js intro (black pot + colorful seeds). DOM/visual.
- `static/js/app.js` — controller: fetch questions, mount renders, wire nav/progress, API submit + inquiry, PNG export. DOM.
- `templates/index.html` — SPA shell (progress header, step container, nav footer, CDN scripts, module entry).
- `core/tests/test_frontend.py` — pytest: shell serves with required hooks + asset references.

**Note on ES modules under Node:** the pure modules use `export`/`import`. Test files use the `.mjs` extension so Node treats them as ES modules without a `package.json`. The source modules use `.js`; tests import them with an explicit extension (e.g. `import { ... } from './state.js'`). Run tests with `node --test static/js/<name>.test.mjs`.

---

## Task 1: Step machine (`state.js`)

**Files:**
- Create: `static/js/state.js`
- Test: `static/js/state.test.mjs`

- [ ] **Step 1: Write the failing test**

`static/js/state.test.mjs`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  STEP_ORDER, createInitialState, stepKind, questionIndexAt,
  progressPercent, canGoNext, nextIndex, prevIndex, setAnswer,
} from './state.js';

test('STEP_ORDER has 15 steps in the right shape', () => {
  assert.equal(STEP_ORDER.length, 15);
  assert.equal(STEP_ORDER[0], 'intro');
  assert.equal(STEP_ORDER[1], 'track');
  assert.equal(STEP_ORDER[2], 'basic');
  assert.equal(STEP_ORDER[13], 'result');
  assert.equal(STEP_ORDER[14], 'cta');
});

test('stepKind + questionIndexAt map question steps', () => {
  assert.equal(stepKind(0), 'intro');
  assert.equal(stepKind(3), 'question');
  assert.equal(questionIndexAt(3), 0);
  assert.equal(questionIndexAt(12), 9);
  assert.equal(stepKind(13), 'result');
});

test('progressPercent spans 0..100', () => {
  assert.equal(progressPercent(0), 0);
  assert.equal(progressPercent(14), 100);
  assert.ok(progressPercent(7) > 0 && progressPercent(7) < 100);
});

test('canGoNext gates track and question steps', () => {
  const s = createInitialState();
  // intro -> always ok
  assert.equal(canGoNext({ ...s, stepIndex: 0 }), true);
  // track step requires a track
  assert.equal(canGoNext({ ...s, stepIndex: 1, track: null }), false);
  assert.equal(canGoNext({ ...s, stepIndex: 1, track: 'brand' }), true);
  // basic step requires a non-empty name
  assert.equal(canGoNext({ ...s, stepIndex: 2, basicInfo: { name: '' } }), false);
  assert.equal(canGoNext({ ...s, stepIndex: 2, basicInfo: { name: '씨앗' } }), true);
  // question step requires an answer for that question id
  const q = { ...s, stepIndex: 3, track: 'brand', answers: [] };
  assert.equal(canGoNext(q), false);
  assert.equal(canGoNext({ ...q, answers: [{ qid: 'b1', choice: '따뜻함' }] }), true);
});

test('nextIndex/prevIndex clamp to range', () => {
  assert.equal(nextIndex(0), 1);
  assert.equal(nextIndex(14), 14);
  assert.equal(prevIndex(0), 0);
  assert.equal(prevIndex(5), 4);
});

test('setAnswer upserts by qid immutably', () => {
  const s = createInitialState();
  const s1 = setAnswer(s, { qid: 'b1', choice: '따뜻함' });
  assert.equal(s1.answers.length, 1);
  const s2 = setAnswer(s1, { qid: 'b1', choice: '대담함', text: '씨앗' });
  assert.equal(s2.answers.length, 1);
  assert.equal(s2.answers[0].choice, '대담함');
  assert.equal(s2.answers[0].text, '씨앗');
  assert.notEqual(s, s1); // immutability
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd /Users/soomni/B-POT && node --test static/js/state.test.mjs`
Expected: FAIL — cannot find module `./state.js`.

- [ ] **Step 3: Write `static/js/state.js`**

```js
// B-POT step machine. Pure functions over a plain state object.
// Question steps map to the track's 10 questions by position; the controller
// supplies the actual question ids when recording answers.

export const STEP_ORDER = [
  'intro', 'track', 'basic',
  'q0', 'q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q9',
  'result', 'cta',
];

const FIRST_QUESTION = 3; // STEP_ORDER index of q0

export function createInitialState() {
  return {
    stepIndex: 0,
    track: null,
    basicInfo: { name: '', category: '', target: '' },
    answers: [],
    result: null,
  };
}

export function stepKind(stepIndex) {
  const id = STEP_ORDER[stepIndex];
  if (id === 'intro' || id === 'track' || id === 'basic' || id === 'result' || id === 'cta') {
    return id;
  }
  return 'question';
}

export function questionIndexAt(stepIndex) {
  return stepIndex - FIRST_QUESTION; // 0..9 for question steps
}

export function progressPercent(stepIndex) {
  return (stepIndex / (STEP_ORDER.length - 1)) * 100;
}

export function nextIndex(stepIndex) {
  return Math.min(stepIndex + 1, STEP_ORDER.length - 1);
}

export function prevIndex(stepIndex) {
  return Math.max(stepIndex - 1, 0);
}

export function setAnswer(state, answer) {
  const others = state.answers.filter((a) => a.qid !== answer.qid);
  return { ...state, answers: [...others, answer] };
}

// canGoNext needs to know the current question's id to check it is answered.
// For question steps it derives the expected qid prefix from the track:
// brand -> b{n+1}, personal -> p{n+1}.
export function canGoNext(state) {
  const kind = stepKind(state.stepIndex);
  if (kind === 'track') return !!state.track;
  if (kind === 'basic') return !!(state.basicInfo && state.basicInfo.name && state.basicInfo.name.trim());
  if (kind === 'question') {
    const n = questionIndexAt(state.stepIndex) + 1;
    const prefix = state.track === 'personal' ? 'p' : 'b';
    const qid = `${prefix}${n}`;
    return state.answers.some((a) => a.qid === qid && a.choice);
  }
  return true; // intro, result, cta
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd /Users/soomni/B-POT && node --test static/js/state.test.mjs`
Expected: all tests pass (`# pass 6`).

- [ ] **Step 5: Commit**

```bash
git add static/js/state.js static/js/state.test.mjs
git commit -m "feat(frontend): step machine with progress and per-step validity"
```

---

## Task 2: Payload builders + validation (`payload.js`)

**Files:**
- Create: `static/js/payload.js`
- Test: `static/js/payload.test.mjs`

- [ ] **Step 1: Write the failing test**

`static/js/payload.test.mjs`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSubmitPayload, buildInquiryPayload, inquiryErrors } from './payload.js';

test('buildSubmitPayload shapes track/basic_info/answers', () => {
  const state = {
    track: 'brand',
    basicInfo: { name: '씨앗가게', category: '리테일', target: '20대' },
    answers: [{ qid: 'b1', choice: '따뜻함', text: '씨앗' }],
  };
  const p = buildSubmitPayload(state);
  assert.equal(p.track, 'brand');
  assert.deepEqual(p.basic_info, { name: '씨앗가게', category: '리테일', target: '20대' });
  assert.equal(p.answers[0].qid, 'b1');
});

test('buildInquiryPayload includes result_id when present', () => {
  const form = { inquiry_type: 'coffeechat', company: '숨니', manager: '숨니', email: 'a@b.com' };
  const p = buildInquiryPayload(form, 42);
  assert.equal(p.result_id, 42);
  assert.equal(p.company, '숨니');
  const p2 = buildInquiryPayload(form, null);
  assert.equal('result_id' in p2, false);
});

test('inquiryErrors flags missing/invalid fields', () => {
  assert.deepEqual(inquiryErrors({ inquiry_type: 'coffeechat', company: 'C', manager: 'M', email: 'a@b.com' }), []);
  const errs = inquiryErrors({ inquiry_type: '', company: '', manager: 'M', email: 'bad' });
  assert.ok(errs.includes('inquiry_type'));
  assert.ok(errs.includes('company'));
  assert.ok(errs.includes('email'));
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd /Users/soomni/B-POT && node --test static/js/payload.test.mjs`
Expected: FAIL — cannot find module `./payload.js`.

- [ ] **Step 3: Write `static/js/payload.js`**

```js
// Pure builders/validators for API payloads.

export function buildSubmitPayload(state) {
  return {
    track: state.track,
    basic_info: {
      name: state.basicInfo.name || '',
      category: state.basicInfo.category || '',
      target: state.basicInfo.target || '',
    },
    answers: state.answers,
  };
}

export function buildInquiryPayload(form, resultId) {
  const p = {
    inquiry_type: form.inquiry_type,
    company: form.company,
    manager: form.manager,
    email: form.email,
  };
  if (resultId) p.result_id = resultId;
  return p;
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function inquiryErrors(form) {
  const errs = [];
  for (const k of ['inquiry_type', 'company', 'manager', 'email']) {
    if (!form[k] || !String(form[k]).trim()) errs.push(k);
  }
  if (form.email && !EMAIL_RE.test(form.email) && !errs.includes('email')) errs.push('email');
  return errs;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd /Users/soomni/B-POT && node --test static/js/payload.test.mjs`
Expected: all pass (`# pass 3`).

- [ ] **Step 5: Commit**

```bash
git add static/js/payload.js static/js/payload.test.mjs
git commit -m "feat(frontend): submit/inquiry payload builders and validation"
```

---

## Task 3: Screen renderers (`render.js`)

Pure functions that return HTML strings for the non-result screens. The controller
injects the string into the step container. `escapeHtml` guards user text.

**Files:**
- Create: `static/js/render.js`
- Test: `static/js/render.test.mjs`

- [ ] **Step 1: Write the failing test**

`static/js/render.test.mjs`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  escapeHtml, renderTrack, renderBasic, renderQuestion, renderCta,
} from './render.js';

test('escapeHtml neutralizes markup', () => {
  assert.equal(escapeHtml('<b>"x"&'), '&lt;b&gt;&quot;x&quot;&amp;');
});

test('renderTrack shows both tracks with data hooks', () => {
  const html = renderTrack('brand');
  assert.ok(html.includes('data-track="brand"'));
  assert.ok(html.includes('data-track="personal"'));
  assert.ok(html.includes('is-selected')); // brand currently selected
});

test('renderBasic prefills values and includes privacy notice', () => {
  const html = renderBasic({ name: '씨앗', category: '', target: '' });
  assert.ok(html.includes('value="씨앗"'));
  assert.ok(html.includes('주민등록번호')); // privacy notice text
  assert.ok(html.includes('name="name"'));
});

test('renderQuestion lists options and marks the chosen one', () => {
  const q = { id: 'b1', item: 'naming', prompt: '한 단어는?', options: ['따뜻함', '대담함'], input: true };
  const html = renderQuestion(q, { qid: 'b1', choice: '대담함', text: '씨앗' }, 1, 10);
  assert.ok(html.includes('한 단어는?'));
  assert.ok(html.includes('data-choice="따뜻함"'));
  assert.ok(html.includes('data-choice="대담함"'));
  assert.ok(html.includes('is-selected')); // 대담함 chosen
  assert.ok(html.includes('name="qtext"')); // optional one-line input present
  assert.ok(html.includes('씨앗')); // prefilled text
  assert.ok(html.includes('1 / 10'));
});

test('renderQuestion omits text input when not allowed', () => {
  const q = { id: 'b2', item: 'naming', prompt: 't', options: ['a', 'b'] };
  const html = renderQuestion(q, null, 2, 10);
  assert.ok(!html.includes('name="qtext"'));
});

test('renderCta lists three inquiry types', () => {
  const html = renderCta();
  assert.ok(html.includes('value="coffeechat"'));
  assert.ok(html.includes('value="campaign"'));
  assert.ok(html.includes('value="workshop"'));
  assert.ok(html.includes('name="email"'));
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd /Users/soomni/B-POT && node --test static/js/render.test.mjs`
Expected: FAIL — cannot find module `./render.js`.

- [ ] **Step 3: Write `static/js/render.js`**

```js
// Pure HTML-string renderers for non-result screens.

export function escapeHtml(s) {
  return String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function renderTrack(selected) {
  const card = (track, title, desc) => `
    <button type="button" class="track-card${selected === track ? ' is-selected' : ''}" data-track="${track}">
      <span class="track-title">${title}</span>
      <span class="track-desc">${desc}</span>
    </button>`;
  return `
    <div class="screen screen-track">
      <p class="kicker">트랙 선택</p>
      <h2 class="screen-title">어떤 씨앗을 심을까요?</h2>
      <div class="track-cards">
        ${card('brand', '브랜드', '스몰 브랜드·1인 브랜드의 시작')}
        ${card('personal', '개인', '퍼스널 브랜딩이 필요한 나')}
      </div>
    </div>`;
}

export function renderBasic(info) {
  const v = (k) => escapeHtml(info && info[k] ? info[k] : '');
  return `
    <div class="screen screen-basic">
      <p class="kicker">기본 정보</p>
      <h2 class="screen-title">씨앗에 이름을 붙여요</h2>
      <label class="field"><span>이름</span>
        <input class="input" name="name" value="${v('name')}" placeholder="브랜드/나의 이름" maxlength="60"></label>
      <label class="field"><span>카테고리</span>
        <input class="input" name="category" value="${v('category')}" placeholder="예: 리테일, 디자인" maxlength="60"></label>
      <label class="field"><span>타깃</span>
        <input class="input" name="target" value="${v('target')}" placeholder="예: 20대 직장인" maxlength="60"></label>
      <label class="field"><span>참고 자료 (선택)</span>
        <input class="input" type="file" name="attachment"></label>
      <p class="notice">주민등록번호, 연락처, 주소 등 중요한 개인정보가 포함된 자료는 첨부하지 말아주세요.</p>
    </div>`;
}

export function renderQuestion(q, answer, number, total) {
  const chosen = answer && answer.choice;
  const opts = q.options.map((o) => `
    <button type="button" class="option${chosen === o ? ' is-selected' : ''}" data-choice="${escapeHtml(o)}">${escapeHtml(o)}</button>`).join('');
  const textField = q.input ? `
    <label class="field field-inline"><span>한 줄 덧붙이기 (선택)</span>
      <input class="input" name="qtext" value="${escapeHtml(answer && answer.text ? answer.text : '')}" maxlength="80" placeholder="자유롭게 적어보세요"></label>` : '';
  return `
    <div class="screen screen-question" data-qid="${escapeHtml(q.id)}">
      <p class="kicker">${escapeHtml(q.item.toUpperCase())} · ${number} / ${total}</p>
      <h2 class="screen-title">${escapeHtml(q.prompt)}</h2>
      <div class="options">${opts}</div>
      ${textField}
    </div>`;
}

export function renderCta() {
  return `
    <div class="screen screen-cta">
      <p class="kicker">함께 가꾸기</p>
      <h2 class="screen-title">더 깊이 다듬고 싶다면</h2>
      <label class="field"><span>유형</span>
        <select class="input" name="inquiry_type">
          <option value="coffeechat">커피챗</option>
          <option value="campaign">캠페인</option>
          <option value="workshop">워크샵</option>
        </select></label>
      <label class="field"><span>회사/이름</span><input class="input" name="company" maxlength="120"></label>
      <label class="field"><span>담당자</span><input class="input" name="manager" maxlength="80"></label>
      <label class="field"><span>이메일</span><input class="input" type="email" name="email" maxlength="120"></label>
      <p class="form-error" data-cta-error hidden></p>
    </div>`;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd /Users/soomni/B-POT && node --test static/js/render.test.mjs`
Expected: all pass (`# pass 6`).

- [ ] **Step 5: Commit**

```bash
git add static/js/render.js static/js/render.test.mjs
git commit -m "feat(frontend): pure HTML renderers for track/basic/question/cta"
```

---

## Task 4: Seed-packet result renderer (`result.js`)

**Files:**
- Create: `static/js/result.js`
- Test: `static/js/result.test.mjs`

- [ ] **Step 1: Write the failing test**

`static/js/result.test.mjs`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderResult } from './result.js';

const GENERATED = {
  naming: { label: 'NAMING', head: '씨앗과 햇살', body: '따뜻함.' },
  mission: { label: 'MISSION', head: '첫 시작을 응원', body: '용기를 심는다.' },
  core_value: { label: 'CORE VALUE', head: '솔직함', body: '진심을 앞에.' },
  concept: { label: 'CONCEPT', head: '시작점', body: '안내자.' },
  persona: { label: 'PERSONA', head: '다정한 친구', body: '응원하는 말투.' },
  communication: { label: 'COMMUNICATION SLOGAN', head: '첫 씨앗을 심다', body: '시작의 감각.' },
};
const ORDER = ['naming', 'mission', 'core_value', 'concept', 'persona', 'communication'];

test('renderResult includes the packet capture node and all 6 items in order', () => {
  const html = renderResult(GENERATED, 'brand', ORDER);
  assert.ok(html.includes('data-capture')); // html2canvas target
  assert.ok(html.includes('B-POT'));
  for (const item of ORDER) {
    assert.ok(html.includes(GENERATED[item].label));
    assert.ok(html.includes(GENERATED[item].head));
  }
  // order preserved: naming label appears before communication label
  assert.ok(html.indexOf('NAMING') < html.indexOf('COMMUNICATION SLOGAN'));
});

test('renderResult escapes head/body and has a save button', () => {
  const g = { naming: { label: 'NAMING', head: '<x>', body: '"b"' } };
  const html = renderResult(g, 'brand', ['naming']);
  assert.ok(html.includes('&lt;x&gt;'));
  assert.ok(html.includes('data-save-png'));
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd /Users/soomni/B-POT && node --test static/js/result.test.mjs`
Expected: FAIL — cannot find module `./result.js`.

- [ ] **Step 3: Write `static/js/result.js`**

```js
// Pure renderer for the vintage seed-packet result. `order` is the track's
// result-item key order (from /api/questions result_items).
import { escapeHtml } from './render.js';

export function renderResult(generated, track, order) {
  const subtitle = track === 'personal' ? 'PERSONAL SEED PACKET' : 'BRAND SEED PACKET';
  const rows = order.map((item) => {
    const block = generated[item];
    if (!block) return '';
    return `
      <div class="packet-item">
        <div class="packet-label">${escapeHtml(block.label)}</div>
        <div class="packet-head">${escapeHtml(block.head)}</div>
        <div class="packet-body">${escapeHtml(block.body)}</div>
      </div>`;
  }).join('');
  return `
    <div class="screen screen-result">
      <div class="packet" data-capture>
        <div class="packet-grain"></div>
        <div class="packet-top">
          <div class="packet-wordmark">B-POT</div>
          <div class="packet-sub">${subtitle}</div>
        </div>
        <div class="packet-window">
          <svg viewBox="0 0 96 96" width="76" height="76"><use href="#seed-a" fill="#E8552D"/></svg>
          <svg viewBox="0 0 96 96" width="52" height="52" class="packet-seed-2"><use href="#seed-b" fill="#F2B90F"/></svg>
        </div>
        <div class="packet-rows">${rows}</div>
        <div class="packet-foot">b-pot.kr · 씨앗이 처음 심기는 POT</div>
      </div>
      <button type="button" class="btn-save" data-save-png>이미지로 저장 (PNG)</button>
    </div>`;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd /Users/soomni/B-POT && node --test static/js/result.test.mjs`
Expected: all pass (`# pass 2`).

- [ ] **Step 5: Commit**

```bash
git add static/js/result.js static/js/result.test.mjs
git commit -m "feat(frontend): seed-packet result renderer"
```

---

## Task 5: Design system CSS + SPA shell template

**Files:**
- Create: `static/css/app.css`
- Create: `static/img/seeds.svg`
- Modify: `templates/index.html`
- Test: `core/tests/test_frontend.py`

- [ ] **Step 1: Write the failing test**

`core/tests/test_frontend.py`:
```python
import pytest

@pytest.mark.django_db
def test_index_has_spa_shell_hooks(client):
    html = client.get("/").content.decode()
    # shell structure
    assert 'data-step-container' in html
    assert 'data-progress-fill' in html
    assert 'data-nav-prev' in html
    assert 'data-nav-next' in html
    # asset wiring
    assert 'css/app.css' in html
    assert 'js/app.js' in html
    assert 'type="module"' in html  # app.js loaded as ES module
    # CDN libs for intro + png
    assert 'three' in html.lower()
    assert 'html2canvas' in html
    # inline seed svg defs present
    assert 'id="seed-a"' in html
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd /Users/soomni/B-POT && .venv/bin/python -m pytest core/tests/test_frontend.py -v`
Expected: FAIL — shell hooks missing.

- [ ] **Step 3: Create `static/img/seeds.svg`** (reference copy of the seed symbol defs; the same defs are inlined into the shell in Step 5)

```svg
<svg xmlns="http://www.w3.org/2000/svg" style="display:none">
  <defs>
    <g id="seed-a"><path d="M40 8 C66 2 88 22 84 50 C81 74 58 90 32 84 C9 79 4 50 12 30 C17 17 28 11 40 8 Z"/></g>
    <g id="seed-b"><path d="M20 30 C28 8 60 4 80 18 C96 30 92 60 74 76 C54 92 22 86 12 64 C6 50 12 42 20 30 Z"/></g>
  </defs>
</svg>
```

- [ ] **Step 4: Create `static/css/app.css`**

```css
:root {
  --sky: #D6EEF7;
  --ink: #161616;
  --ink-soft: #1d5d77;
  --seed-tomato: #E8552D;
  --seed-orange: #F2A20C;
  --seed-gold: #F2B90F;
  --seed-green: #5DAA3C;
  --seed-teal: #3FA9A0;
  --paper: #E9D4B3;
  --max: 460px;
}
* { box-sizing: border-box; }
html, body { margin: 0; height: 100%; }
body {
  font-family: 'Pretendard', system-ui, sans-serif;
  background: var(--sky);
  color: var(--ink);
  -webkit-font-smoothing: antialiased;
}
#app { display: flex; flex-direction: column; min-height: 100dvh; max-width: var(--max); margin: 0 auto; position: relative; }

/* Header: progress */
.app-header { position: sticky; top: 0; padding: 16px 20px 8px; background: linear-gradient(180deg, var(--sky) 70%, transparent); z-index: 5; }
.step-label { font-size: 12px; font-weight: 800; letter-spacing: .08em; color: var(--ink-soft); text-transform: uppercase; }
.progress-track { margin-top: 8px; height: 6px; background: rgba(22,22,22,.12); border-radius: 6px; overflow: hidden; }
.progress-fill { height: 100%; width: 0; background: var(--ink); transition: width .25s ease; }

/* Step container */
.step-container { flex: 1; display: flex; flex-direction: column; justify-content: center; padding: 12px 20px 24px; }
.screen { display: flex; flex-direction: column; gap: 16px; }
.kicker { font-size: 11px; font-weight: 800; letter-spacing: .14em; color: var(--seed-tomato); text-transform: uppercase; margin: 0; }
.screen-title { font-size: 24px; line-height: 1.35; font-weight: 800; margin: 0; color: var(--ink); }

/* Track cards */
.track-cards { display: flex; flex-direction: column; gap: 12px; }
.track-card { text-align: left; border: 2px solid rgba(22,22,22,.3); background: #fff; border-radius: 16px; padding: 18px; cursor: pointer; display: flex; flex-direction: column; gap: 4px; }
.track-card.is-selected { border-color: var(--ink); }
.track-title { font-size: 18px; font-weight: 800; }
.track-desc { font-size: 13px; color: var(--ink-soft); }

/* Fields */
.field { display: flex; flex-direction: column; gap: 6px; font-size: 13px; font-weight: 700; color: var(--ink-soft); }
.input { font: inherit; padding: 12px 14px; border: 2px solid rgba(22,22,22,.25); border-radius: 12px; background: #fff; color: var(--ink); }
.input:focus { outline: none; border-color: var(--ink); }
.notice { font-size: 12px; color: var(--ink-soft); line-height: 1.5; background: rgba(255,255,255,.6); padding: 10px 12px; border-radius: 10px; }

/* Options */
.options { display: flex; flex-direction: column; gap: 10px; }
.option { text-align: left; font: inherit; font-weight: 600; padding: 14px 16px; border: 2px solid rgba(22,22,22,.25); border-radius: 14px; background: #fff; color: var(--ink); cursor: pointer; }
.option.is-selected { border-color: var(--ink); background: var(--seed-gold); }

/* Nav footer */
.app-nav { position: sticky; bottom: 0; display: flex; gap: 10px; padding: 14px 20px; background: linear-gradient(0deg, var(--sky) 70%, transparent); }
.app-nav button { flex: 1; font: inherit; font-weight: 800; padding: 14px; border-radius: 12px; cursor: pointer; border: 2px solid var(--ink); }
.nav-prev { background: transparent; color: var(--ink); }
.nav-next { background: var(--ink); color: #fff; }
.app-nav button:disabled { opacity: .35; cursor: not-allowed; }

/* Intro */
.screen-intro { align-items: center; text-align: center; gap: 20px; }
#intro-canvas { width: 100%; max-width: 320px; height: 320px; }
.intro-title { font-size: 40px; font-weight: 900; letter-spacing: .14em; margin: 0; }
.intro-sub { font-size: 13px; letter-spacing: .2em; color: var(--ink-soft); margin: 0; }
.btn-start { font: inherit; font-weight: 800; background: var(--ink); color: #fff; border: none; border-radius: 999px; padding: 14px 36px; cursor: pointer; }

/* Result packet */
.screen-result { align-items: center; gap: 18px; }
.packet { width: 100%; max-width: 360px; border: 2px solid var(--ink); border-radius: 6px; background: var(--paper); position: relative; overflow: hidden; }
.packet-grain { position: absolute; inset: 0; pointer-events: none; opacity: .5;
  background: repeating-linear-gradient(0deg, rgba(22,22,22,.03) 0 2px, transparent 2px 5px); }
.packet-top { background: var(--ink); color: #fff; text-align: center; padding: 16px; }
.packet-wordmark { font-size: 24px; font-weight: 900; letter-spacing: .12em; }
.packet-sub { font-size: 10px; letter-spacing: .22em; color: var(--seed-gold); margin-top: 3px; }
.packet-window { display: flex; align-items: center; justify-content: center; gap: 4px; margin: 16px; border: 1.5px dashed var(--ink); border-radius: 14px; height: 110px; }
.packet-seed-2 { margin-top: 26px; margin-left: -8px; }
.packet-rows { padding: 0 18px 14px; }
.packet-item { padding: 11px 0; border-top: 1px solid rgba(22,22,22,.2); }
.packet-item:first-child { border-top: none; }
.packet-label { font-size: 10px; letter-spacing: .16em; color: var(--ink-soft); font-weight: 800; }
.packet-head { font-size: 16px; font-weight: 800; margin: 3px 0 2px; }
.packet-body { font-size: 12px; line-height: 1.5; color: #3a3a3a; }
.packet-foot { background: var(--ink); color: #fff; text-align: center; padding: 10px; font-size: 11px; letter-spacing: .08em; }
.btn-save { font: inherit; font-weight: 800; background: var(--ink); color: #fff; border: none; border-radius: 12px; padding: 13px 24px; cursor: pointer; }

.form-error { color: var(--seed-tomato); font-size: 13px; font-weight: 700; margin: 0; }
.is-hidden { display: none !important; }
```

- [ ] **Step 5: Replace `templates/index.html`** (SPA shell)

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
  <title>B-POT</title>
  <link rel="preconnect" href="https://cdn.jsdelivr.net">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css">
  {% load static %}
  <link rel="stylesheet" href="{% static 'css/app.css' %}">
  <script src="https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js" defer></script>
  <script type="importmap">
    { "imports": { "three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js" } }
  </script>
</head>
<body>
  <!-- inline seed symbol defs (referenced by <use href="#seed-a">) -->
  <svg xmlns="http://www.w3.org/2000/svg" style="position:absolute;width:0;height:0" aria-hidden="true">
    <defs>
      <g id="seed-a"><path d="M40 8 C66 2 88 22 84 50 C81 74 58 90 32 84 C9 79 4 50 12 30 C17 17 28 11 40 8 Z"/></g>
      <g id="seed-b"><path d="M20 30 C28 8 60 4 80 18 C96 30 92 60 74 76 C54 92 22 86 12 64 C6 50 12 42 20 30 Z"/></g>
    </defs>
  </svg>

  <div id="app" data-app-root>
    <header class="app-header">
      <div class="step-label" data-step-label>B-POT</div>
      <div class="progress-track"><div class="progress-fill" data-progress-fill></div></div>
    </header>
    <main class="step-container" data-step-container></main>
    <nav class="app-nav">
      <button type="button" class="nav-prev" data-nav-prev>이전</button>
      <button type="button" class="nav-next" data-nav-next>다음</button>
    </nav>
  </div>

  <script type="module" src="{% static 'js/app.js' %}"></script>
</body>
</html>
```

- [ ] **Step 6: Create a placeholder `static/js/app.js`** so the module entry resolves (full controller in Task 6)

```js
// Placeholder; full controller implemented in Task 6.
console.debug('B-POT app booting');
```

- [ ] **Step 7: Create a stub `static/js/intro3d.js`** so the controller's import resolves before Task 7 (which replaces this file with the real 3D intro)

```js
// Stub: real Three.js intro is implemented in Task 7. No-op until then so
// app.js (Task 6) can import { mountIntro } without the module failing to load.
export function mountIntro(_canvas) {}
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `cd /Users/soomni/B-POT && .venv/bin/python -m pytest core/tests/test_frontend.py -v`
Expected: 1 passed.

- [ ] **Step 9: Commit**

```bash
git add static/css/app.css static/img/seeds.svg templates/index.html static/js/app.js static/js/intro3d.js core/tests/test_frontend.py
git commit -m "feat(frontend): design system, seed defs, and SPA shell template"
```

---

## Task 6: App controller (`app.js`) — wiring, navigation, API, PNG

This is a DOM-integration task. Pure logic is already tested (Tasks 1–4); this controller
wires it to the DOM. Verification is structural (pytest from Task 5 still passes) plus a
**manual browser check** (instructions in Step 4).

**Files:**
- Modify: `static/js/app.js`

- [ ] **Step 1: Replace `static/js/app.js` with the controller**

```js
import {
  STEP_ORDER, createInitialState, stepKind, questionIndexAt,
  progressPercent, canGoNext, nextIndex, prevIndex, setAnswer,
} from './state.js';
import { renderTrack, renderBasic, renderQuestion, renderCta } from './render.js';
import { renderResult } from './result.js';
import { buildSubmitPayload, buildInquiryPayload, inquiryErrors } from './payload.js';
import { mountIntro } from './intro3d.js';

const $ = (sel, root = document) => root.querySelector(sel);

const els = {
  container: $('[data-step-container]'),
  progress: $('[data-progress-fill]'),
  label: $('[data-step-label]'),
  prev: $('[data-nav-prev]'),
  next: $('[data-nav-next]'),
};

let state = createInitialState();
let questions = null; // { brand, personal, result_items, item_labels }

async function boot() {
  const resp = await fetch('/api/questions/');
  questions = await resp.json();
  els.prev.addEventListener('click', onPrev);
  els.next.addEventListener('click', onNext);
  render();
}

function trackQuestions() {
  return questions[state.track === 'personal' ? 'personal' : 'brand'];
}

function currentQuestion() {
  return trackQuestions()[questionIndexAt(state.stepIndex)];
}

function answerFor(qid) {
  return state.answers.find((a) => a.qid === qid) || null;
}

function render() {
  const kind = stepKind(state.stepIndex);
  els.progress.style.width = progressPercent(state.stepIndex) + '%';
  els.label.textContent = labelFor(kind);
  els.container.scrollTop = 0;

  if (kind === 'intro') renderIntro();
  else if (kind === 'track') els.container.innerHTML = renderTrack(state.track);
  else if (kind === 'basic') els.container.innerHTML = renderBasic(state.basicInfo);
  else if (kind === 'question') {
    const q = currentQuestion();
    els.container.innerHTML = renderQuestion(q, answerFor(q.id), questionIndexAt(state.stepIndex) + 1, 10);
  } else if (kind === 'result') renderResultStep();
  else if (kind === 'cta') els.container.innerHTML = renderCta();

  wireScreen(kind);
  updateNav(kind);
}

function labelFor(kind) {
  const map = { intro: '시작', track: '트랙 선택', basic: '기본 정보', question: '질문', result: '결과지', cta: '문의' };
  return `${map[kind]} · ${state.stepIndex + 1} / ${STEP_ORDER.length}`;
}

function updateNav(kind) {
  els.prev.classList.toggle('is-hidden', kind === 'intro');
  els.next.classList.toggle('is-hidden', kind === 'intro' || kind === 'result' || kind === 'cta');
  els.next.disabled = !canGoNext(state);
}

function renderIntro() {
  els.container.innerHTML = `
    <div class="screen screen-intro">
      <canvas id="intro-canvas"></canvas>
      <h1 class="intro-title">B-POT</h1>
      <p class="intro-sub">씨앗을 심다</p>
      <button type="button" class="btn-start" data-start>씨앗 심기 →</button>
    </div>`;
}

function wireScreen(kind) {
  if (kind === 'intro') {
    mountIntro($('#intro-canvas'));
    $('[data-start]').addEventListener('click', () => go(nextIndex(state.stepIndex)));
  }
  if (kind === 'track') {
    els.container.querySelectorAll('[data-track]').forEach((btn) => {
      btn.addEventListener('click', () => { state = { ...state, track: btn.dataset.track }; render(); });
    });
  }
  if (kind === 'basic') {
    els.container.querySelectorAll('input[name]').forEach((input) => {
      if (input.type === 'file') return;
      input.addEventListener('input', () => {
        state = { ...state, basicInfo: { ...state.basicInfo, [input.name]: input.value } };
        els.next.disabled = !canGoNext(state);
      });
    });
    const file = $('input[type="file"]', els.container);
    if (file) file.addEventListener('change', () => { state._file = file.files[0] || null; });
  }
  if (kind === 'question') {
    const q = currentQuestion();
    els.container.querySelectorAll('[data-choice]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const prev = answerFor(q.id) || { qid: q.id };
        state = setAnswer(state, { ...prev, qid: q.id, choice: btn.dataset.choice });
        render();
      });
    });
    const text = $('input[name="qtext"]', els.container);
    if (text) text.addEventListener('input', () => {
      const prev = answerFor(q.id) || { qid: q.id, choice: undefined };
      state = setAnswer(state, { ...prev, text: text.value });
    });
  }
  if (kind === 'result') {
    const saveBtn = $('[data-save-png]', els.container);
    if (saveBtn) saveBtn.addEventListener('click', savePng);
  }
  if (kind === 'cta') wireCta();
}

async function onNext() {
  const kind = stepKind(state.stepIndex);
  if (!canGoNext(state)) return;
  // Submit happens when leaving the last question (entering result).
  if (kind === 'question' && questionIndexAt(state.stepIndex) === 9) {
    await submit();
  }
  go(nextIndex(state.stepIndex));
}

function onPrev() { go(prevIndex(state.stepIndex)); }

function go(index) { state = { ...state, stepIndex: index }; render(); }

async function submit() {
  els.next.disabled = true;
  try {
    const fd = new FormData();
    fd.append('payload', JSON.stringify(buildSubmitPayload(state)));
    if (state._file) fd.append('attachment', state._file);
    const resp = await fetch('/api/submit/', { method: 'POST', body: fd });
    if (!resp.ok) throw new Error('submit failed');
    state = { ...state, result: await resp.json() };
  } catch (e) {
    state = { ...state, result: { generated: fallbackGenerated() } };
    alert('결과 생성에 문제가 있어 기본 결과로 보여드려요. 잠시 후 다시 시도해 주세요.');
  }
}

function fallbackGenerated() {
  const order = questions.result_items[state.track === 'personal' ? 'personal' : 'brand'];
  const labels = questions.item_labels;
  const g = {};
  for (const item of order) g[item] = { label: labels[item], head: '당신의 첫 씨앗', body: '잠시 후 다시 시도해 주세요.' };
  return g;
}

function renderResultStep() {
  const order = questions.result_items[state.track === 'personal' ? 'personal' : 'brand'];
  els.container.innerHTML = renderResult(state.result.generated, state.track, order);
}

async function savePng() {
  const node = $('[data-capture]', els.container);
  const canvas = await window.html2canvas(node, { backgroundColor: null, scale: 2 });
  const link = document.createElement('a');
  link.download = 'b-pot-seed.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
}

function wireCta() {
  els.next.classList.add('is-hidden');
  const form = els.container;
  const sendBtn = document.createElement('button');
  sendBtn.type = 'button';
  sendBtn.className = 'btn-start';
  sendBtn.textContent = '문의 보내기';
  $('.screen-cta', form).appendChild(sendBtn);
  sendBtn.addEventListener('click', async () => {
    const data = readCta();
    const errs = inquiryErrors(data);
    const errEl = $('[data-cta-error]', form);
    if (errs.length) { errEl.hidden = false; errEl.textContent = '필수 항목을 확인해 주세요.'; return; }
    errEl.hidden = true;
    const payload = buildInquiryPayload(data, state.result ? state.result.result_id : null);
    const resp = await fetch('/api/inquiry/', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    });
    if (resp.ok) { $('.screen-cta', form).innerHTML = '<h2 class="screen-title">고맙습니다. 곧 연락드릴게요.</h2>'; }
    else { errEl.hidden = false; errEl.textContent = '전송에 실패했어요. 잠시 후 다시 시도해 주세요.'; }
  });
}

function readCta() {
  const data = {};
  els.container.querySelectorAll('input[name], select[name]').forEach((el) => { data[el.name] = el.value; });
  return data;
}

boot();
```

- [ ] **Step 2: Run the existing logic + shell tests to confirm no regressions**

Run: `cd /Users/soomni/B-POT && node --test static/js/*.test.mjs && .venv/bin/python -m pytest core/tests/test_frontend.py -q`
Expected: all node tests pass; pytest 1 passed.

- [ ] **Step 3: Commit**

```bash
git add static/js/app.js
git commit -m "feat(frontend): SPA controller — navigation, API submit/inquiry, PNG"
```

- [ ] **Step 4: Manual browser verification** (record results in the commit/PR, do not skip)

Run the server: `cd /Users/soomni/B-POT && .venv/bin/python manage.py migrate && .venv/bin/python manage.py runserver`
Open `http://127.0.0.1:8000/` and verify:
1. Intro shows the 3D canvas + "씨앗 심기" → advances to track.
2. Selecting a track enables 다음; basic info requires a name; questions require a choice to advance.
3. After question 10, 다음 submits and shows the seed packet with 6 items.
4. "이미지로 저장 (PNG)" downloads a PNG of the packet.
5. CTA "문의 보내기" with valid fields shows the thank-you state; check the server console for the email output.
Note any issues and fix before proceeding. (Task 7 adds the real 3D intro; until then `mountIntro` is a stub.)

---

## Task 7: Three.js intro (`intro3d.js`)

**Files:**
- Modify: `static/js/intro3d.js` (replace the Task 5 stub with the real intro)
- Test: manual (visual). A pytest already asserts the shell loads `three` via import map.

- [ ] **Step 1: Replace `static/js/intro3d.js`** (the no-op stub from Task 5) with the real intro

```js
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

  // Black pot: a low-poly truncated cone + rim.
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

  // Colorful seeds (flat low-poly spheres) drifting down.
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

  // Stop when the canvas leaves the DOM (next step replaces the container).
  const observer = new MutationObserver(() => {
    if (!document.body.contains(canvas)) { cancelAnimationFrame(raf); observer.disconnect(); renderer.dispose(); }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}
```

- [ ] **Step 2: Manual browser verification**

Run the server and reload `/`. Confirm the intro shows a rotating black pot with colorful seeds drifting; confirm it stops (no console errors, no runaway animation) after pressing "씨앗 심기". On a browser without WebGL, the wordmark still shows and the button still advances.

- [ ] **Step 3: Commit**

```bash
git add static/js/intro3d.js
git commit -m "feat(frontend): lightweight Three.js seed-planting intro"
```

---

## Task 8: End-to-end verification + polish pass

**Files:**
- Modify: as needed from findings (no new files expected)

- [ ] **Step 1: Full automated gate**

Run: `cd /Users/soomni/B-POT && node --test static/js/*.test.mjs && .venv/bin/python -m pytest -q`
Expected: all node tests pass; full pytest suite passes (backend 36 + frontend 1).

- [ ] **Step 2: Full manual run-through** (both tracks)

Run the server. For BOTH brand and personal tracks, complete the entire flow intro→result→CTA. Verify:
- Instant transitions (no slide/fade), progress bar advances, prev/next stay fixed.
- Personal track shows ORIGINALITY (not COMMUNICATION) and its questions.
- NAMING/CORE VALUE/COMMUNICATION(brand) and NAMING/CORE VALUE/ORIGINALITY(personal) question cards show the optional one-line input.
- Result packet renders 6 items in the track's order; PNG export matches what's on screen.
- CTA submits; a Result row and CTAInquiry row appear in `/admin/`.

- [ ] **Step 3: Fix any issues found**, committing each fix with a descriptive message.

- [ ] **Step 4: Final commit** (if polish was applied)

```bash
git add -A
git commit -m "polish(frontend): end-to-end fixes from manual verification"
```

---

## Done criteria (Plan 2)

- `node --test static/js/*.test.mjs` → all green; `pytest -q` → all green.
- Manual run-through of both tracks works end to end: intro 3D → questions → seed-packet result → PNG → CTA email.
- Instant transitions, fixed progress + nav, design system per `b-pot-design-system`.

**Next:** Plan 3 (Render deployment) — render.yaml, WhiteNoise/collectstatic, env vars, production SECRET_KEY guard.
