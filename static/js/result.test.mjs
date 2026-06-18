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
  assert.ok(html.includes('data-capture'));
  assert.ok(html.includes('B-POT'));
  for (const item of ORDER) {
    assert.ok(html.includes(GENERATED[item].label));
    assert.ok(html.includes(GENERATED[item].head));
  }
  assert.ok(html.indexOf('NAMING') < html.indexOf('COMMUNICATION SLOGAN'));
});

test('renderResult escapes head/body and has a save button', () => {
  const g = { naming: { label: 'NAMING', head: '<x>', body: '"b"' } };
  const html = renderResult(g, 'brand', ['naming']);
  assert.ok(html.includes('&lt;x&gt;'));
  assert.ok(html.includes('data-save-png'));
});
