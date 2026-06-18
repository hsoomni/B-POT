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
let questions = null;
let submitting = false;

async function boot() {
  els.prev.addEventListener('click', onPrev);
  els.next.addEventListener('click', onNext);
  try {
    const resp = await fetch('/api/questions/');
    if (!resp.ok) throw new Error('questions fetch failed');
    questions = await resp.json();
  } catch (e) {
    els.container.innerHTML = '<div class="screen"><h2 class="screen-title">불러오지 못했어요</h2><p class="notice">네트워크를 확인하고 새로고침해 주세요.</p></div>';
    return;
  }
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
  else if (kind === 'cta') renderCtaStep();

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
    const ctaBtn = $('[data-go-cta]', els.container);
    if (ctaBtn) ctaBtn.addEventListener('click', () => go(nextIndex(state.stepIndex)));
  }
  if (kind === 'cta' && !state.inquirySent) wireCta();
}

async function onNext() {
  const kind = stepKind(state.stepIndex);
  if (!canGoNext(state) || submitting) return;
  if (kind === 'question' && questionIndexAt(state.stepIndex) === 9 && !state.result) {
    submitting = true;
    try { await submit(); } finally { submitting = false; }
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

function renderCtaStep() {
  if (state.inquirySent) {
    els.container.innerHTML = '<div class="screen"><h2 class="screen-title">고맙습니다. 곧 연락드릴게요.</h2></div>';
    return;
  }
  els.container.innerHTML = renderCta();
}

function renderResultStep() {
  const order = questions.result_items[state.track === 'personal' ? 'personal' : 'brand'];
  els.container.innerHTML = renderResult(state.result.generated, state.track, order);
  const ctaBtn = document.createElement('button');
  ctaBtn.type = 'button';
  ctaBtn.className = 'btn-start';
  ctaBtn.dataset.goCta = '';
  ctaBtn.textContent = '문의하기 →';
  $('.screen-result', els.container).appendChild(ctaBtn);
}

async function savePng() {
  if (!window.html2canvas) { alert('이미지 저장 도구를 불러오지 못했어요. 새로고침 후 다시 시도해 주세요.'); return; }
  const node = $('[data-capture]', els.container);
  const canvas = await window.html2canvas(node, { backgroundColor: null, scale: 2 });
  const link = document.createElement('a');
  link.download = 'b-pot-seed.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
}

function wireCta() {
  const form = els.container;
  if ($('[data-send-cta]', form)) return; // already wired
  const sendBtn = document.createElement('button');
  sendBtn.type = 'button';
  sendBtn.className = 'btn-start';
  sendBtn.dataset.sendCta = '';
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
    if (resp.ok) { state = { ...state, inquirySent: true }; $('.screen-cta', form).innerHTML = '<h2 class="screen-title">고맙습니다. 곧 연락드릴게요.</h2>'; }
    else { errEl.hidden = false; errEl.textContent = '전송에 실패했어요. 잠시 후 다시 시도해 주세요.'; }
  });
}

function readCta() {
  const data = {};
  els.container.querySelectorAll('input[name], select[name]').forEach((el) => { data[el.name] = el.value; });
  return data;
}

boot();
