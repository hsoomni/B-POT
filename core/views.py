import json
import logging
import os

from django.conf import settings
from django.http import JsonResponse
from django.shortcuts import render
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_POST

from . import questions as Q
from . import emails
from .generation import generate, color_accent
from .models import Result, CTAInquiry

logger = logging.getLogger(__name__)


@ensure_csrf_cookie
def index(request):
    """SPA 셸. 문항·결과항목 메타를 JSON으로 주입한다."""
    return render(request, "index.html", {
        "bootstrap": Q.public_payload(),
    })


def _json_body(request):
    try:
        return json.loads(request.body.decode("utf-8") or "{}")
    except (ValueError, UnicodeDecodeError):
        return None


@require_POST
def api_submit(request):
    """답변 제출 → 결과 6항목 생성 → 저장 → 결과 반환."""
    data = _json_body(request)
    if data is None:
        return JsonResponse({"ok": False, "error": "잘못된 요청 형식입니다."}, status=400)

    track = data.get("track")
    if track not in ("brand", "personal"):
        return JsonResponse({"ok": False, "error": "트랙이 올바르지 않습니다."}, status=400)

    basic_info = data.get("basic_info") or {}
    answers = data.get("answers") or []

    # 결과 생성은 항상 성공(빈 입력도 6항목 산출). 생성 실패는 조립으로 폴백됨.
    generated = generate(track, basic_info, answers)

    accent = None
    if track == "personal":
        ca = color_accent((basic_info or {}).get("category"))
        accent = ca["hex"] if ca else None

    result = Result.objects.create(
        track=track,
        basic_info=basic_info,
        answers=answers,
        generated=generated,
    )
    return JsonResponse({
        "ok": True,
        "result_id": result.id,
        "track": track,
        "items": [{"key": k, "label": l, "color": c} for (k, l, c) in Q.get_items(track)],
        "generated": generated,
        "accent": accent,
    })


@require_POST
def api_inquiry(request):
    """CTA 문의 저장(항상 성공이 목표) + 이메일 알림(실패 무시)."""
    data = _json_body(request)
    if data is None:
        return JsonResponse({"ok": False, "error": "잘못된 요청 형식입니다."}, status=400)

    email = (data.get("email") or "").strip()
    if not email:
        return JsonResponse({"ok": False, "error": "이메일을 입력해주세요."}, status=400)

    result = None
    rid = data.get("result_id")
    if rid:
        result = Result.objects.filter(id=rid).first()

    inquiry = CTAInquiry.objects.create(
        inquiry_type=(data.get("inquiry_type") or "")[:20],
        company=(data.get("company") or "")[:200],
        manager=(data.get("manager") or "")[:200],
        email=email[:254],
        result=result,
    )

    # 이메일 알림 — 저장과 분리. 실패해도 사용자 완료 화면은 정상.
    try:
        emails.notify_inquiry(inquiry)
    except Exception as exc:  # noqa: BLE001
        logger.warning("CTA 이메일 알림 실패(무시): %s", exc)

    # Google Sheets 웹훅(선택) — 실패해도 무시.
    try:
        emails.post_to_sheet(inquiry)
    except Exception as exc:  # noqa: BLE001
        logger.warning("CTA 시트 웹훅 실패(무시): %s", exc)

    return JsonResponse({"ok": True, "inquiry_id": inquiry.id})
