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
  assert.ok(html.includes('is-selected'));
});

test('renderBasic prefills values and includes privacy notice', () => {
  const html = renderBasic({ name: '씨앗', category: '', target: '' });
  assert.ok(html.includes('value="씨앗"'));
  assert.ok(html.includes('주민등록번호'));
  assert.ok(html.includes('name="name"'));
});

test('renderQuestion lists options and marks the chosen one', () => {
  const q = { id: 'b1', item: 'naming', prompt: '한 단어는?', options: ['따뜻함', '대담함'], input: true };
  const html = renderQuestion(q, { qid: 'b1', choice: '대담함', text: '씨앗' }, 1, 10);
  assert.ok(html.includes('한 단어는?'));
  assert.ok(html.includes('data-choice="따뜻함"'));
  assert.ok(html.includes('data-choice="대담함"'));
  assert.ok(html.includes('is-selected'));
  assert.ok(html.includes('name="qtext"'));
  assert.ok(html.includes('씨앗'));
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
