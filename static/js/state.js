// B-POT step machine. Pure functions over a plain state object.
// Question steps map to the track's 10 questions by position; the controller
// supplies the actual question ids when recording answers.

export const STEP_ORDER = [
  'intro', 'track', 'basic',
  'q0', 'q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q9',
  'result', 'cta',
];

const FIRST_QUESTION = STEP_ORDER.indexOf('q0'); // self-maintaining if STEP_ORDER changes

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

export function canGoNext(state) {
  const kind = stepKind(state.stepIndex);
  if (kind === 'track') return !!state.track;
  if (kind === 'basic') return !!(state.basicInfo && state.basicInfo.name && state.basicInfo.name.trim());
  if (kind === 'question') {
    if (!state.track) return false;
    const n = questionIndexAt(state.stepIndex) + 1;
    const prefix = state.track === 'personal' ? 'p' : 'b';
    const qid = `${prefix}${n}`;
    return state.answers.some((a) => a.qid === qid && a.choice);
  }
  return true; // intro, result, cta
}
