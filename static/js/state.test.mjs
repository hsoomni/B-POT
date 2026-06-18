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
  assert.equal(canGoNext({ ...s, stepIndex: 0 }), true);
  assert.equal(canGoNext({ ...s, stepIndex: 1, track: null }), false);
  assert.equal(canGoNext({ ...s, stepIndex: 1, track: 'brand' }), true);
  assert.equal(canGoNext({ ...s, stepIndex: 2, basicInfo: { name: '' } }), false);
  assert.equal(canGoNext({ ...s, stepIndex: 2, basicInfo: { name: '씨앗' } }), true);
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
  assert.notEqual(s, s1);
  assert.equal(s1.answers[0].choice, '따뜻함'); // s1 not mutated by creating s2
});
