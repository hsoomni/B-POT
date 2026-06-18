// Pure HTML-string renderers for non-result screens.

export function escapeHtml(s) {
  return String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
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
