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
