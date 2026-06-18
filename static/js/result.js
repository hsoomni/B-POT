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
