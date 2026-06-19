"""CTA 이메일 알림 — 발송 실패는 저장과 분리(상위에서 무시)."""
import logging

from django.conf import settings
from django.core.mail import send_mail

logger = logging.getLogger(__name__)


def notify_inquiry(inquiry):
    type_label = inquiry.get_inquiry_type_display() or "문의"
    subject = f"[B-POT] 새 {type_label} 문의 · {inquiry.company or inquiry.email}"
    lines = [
        "B-POT에 새 CTA 문의가 접수되었습니다.",
        "",
        f"유형      : {type_label}",
        f"회사/이름 : {inquiry.company or '-'}",
        f"담당자    : {inquiry.manager or '-'}",
        f"이메일    : {inquiry.email}",
        f"접수일시  : {inquiry.created_at:%Y-%m-%d %H:%M}",
    ]
    if inquiry.result_id:
        info = (inquiry.result.basic_info or {})
        lines.append(f"연결 결과 : #{inquiry.result_id} ({info.get('name', '-')})")
    body = "\n".join(lines)

    # 발송 실패가 저장/완료 화면을 막지 않도록 fail_silently=True
    send_mail(
        subject,
        body,
        settings.DEFAULT_FROM_EMAIL,
        [settings.EMAIL_TO],
        fail_silently=True,
    )


def post_to_sheet(inquiry):
    """CTA 문의를 Google Sheets 웹훅으로 전송(선택). 실패는 무시.

    SHEETS_WEBHOOK_URL(Google Apps Script 웹앱 등)이 설정된 경우에만 동작.
    개인정보는 시트로만 전송되며 AI/외부에는 전송하지 않는다.
    """
    url = getattr(settings, "SHEETS_WEBHOOK_URL", "")
    if not url:
        return
    import requests
    payload = {
        "type": inquiry.get_inquiry_type_display() or "",
        "company": inquiry.company,
        "manager": inquiry.manager,
        "email": inquiry.email,
        "result_id": inquiry.result_id or "",
        "created_at": inquiry.created_at.strftime("%Y-%m-%d %H:%M"),
    }
    requests.post(url, json=payload, timeout=6)
