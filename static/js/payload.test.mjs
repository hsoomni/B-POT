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

test('inquiryErrors treats whitespace-only as missing and flags manager', () => {
  const errs = inquiryErrors({ inquiry_type: 'coffeechat', company: '   ', manager: '', email: 'a@b.com' });
  assert.ok(errs.includes('company'));  // whitespace-only counts as missing
  assert.ok(errs.includes('manager'));  // required field missing
  assert.ok(!errs.includes('email'));   // valid email not flagged
});
