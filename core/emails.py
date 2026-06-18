from django.conf import settings
from django.core.mail import send_mail


def send_inquiry_notification(inquiry):
    """Email the team about a new CTA inquiry. Returns True on send.

    Raises on transport error; callers isolate failures from inquiry persistence.
    """
    subject = f"[B-POT] 새 문의 · {inquiry.get_inquiry_type_display()} · {inquiry.company}"
    lines = [
        f"유형: {inquiry.get_inquiry_type_display()}",
        f"회사/이름: {inquiry.company}",
        f"담당자: {inquiry.manager}",
        f"이메일: {inquiry.email}",
        f"연결 결과: #{inquiry.result_id}" if inquiry.result_id else "연결 결과: 없음",
        f"생성: {inquiry.created_at:%Y-%m-%d %H:%M}",
    ]
    send_mail(
        subject=subject,
        message="\n".join(lines),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[settings.EMAIL_TO],
        fail_silently=False,
    )
    return True
