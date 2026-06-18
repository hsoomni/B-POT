import json
import logging
import os
from django.conf import settings
from django.http import JsonResponse
from django.shortcuts import render
from django.views.decorators.http import require_http_methods, require_POST
from django.views.decorators.csrf import csrf_exempt

from core import questions as Q
from core.generation import generate
from core.models import Result, CTAInquiry
from core.emails import send_inquiry_notification

def index(request):
    return render(request, "index.html")

@require_http_methods(["GET"])
def api_questions(request):
    return JsonResponse({
        "brand": Q.get_questions("brand"),
        "personal": Q.get_questions("personal"),
        "result_items": Q.RESULT_ITEMS,
        "item_labels": Q.ITEM_LABELS,
    })

def _parse_submit(request):
    """Return (payload_dict, attachment_or_None). Supports JSON or multipart."""
    if request.content_type and request.content_type.startswith("multipart/"):
        payload = json.loads(request.POST.get("payload", "{}"))
        return payload, request.FILES.get("attachment")
    return json.loads(request.body or "{}"), None

def _validate_attachment(f):
    """Return an error code string if invalid, else None."""
    ext = os.path.splitext(f.name)[1].lower()
    if ext not in settings.ALLOWED_UPLOAD_EXTS:
        return "bad_ext"
    if f.size > settings.MAX_UPLOAD_BYTES:
        return "too_large"
    return None

@csrf_exempt
@require_POST
def api_submit(request):
    try:
        payload, attachment = _parse_submit(request)
    except json.JSONDecodeError:
        return JsonResponse({"error": "invalid_json"}, status=400)

    track = payload.get("track")
    if track not in Q.RESULT_ITEMS:
        return JsonResponse({"error": "unknown_track"}, status=400)

    if attachment is not None:
        err = _validate_attachment(attachment)
        if err:
            return JsonResponse({"error": err}, status=400)

    answers = payload.get("answers") or []
    basic_info = payload.get("basic_info") or {}
    generated = generate(track, answers, basic_info)

    result = Result.objects.create(
        track=track, basic_info=basic_info, answers=answers,
        generated=generated, attachment=attachment,
    )
    return JsonResponse({"result_id": result.pk, "generated": generated})


@csrf_exempt
@require_POST
def api_inquiry(request):
    try:
        payload = json.loads(request.body or "{}")
    except json.JSONDecodeError:
        return JsonResponse({"error": "invalid_json"}, status=400)

    required = ("inquiry_type", "company", "manager", "email")
    if not all(payload.get(k) for k in required):
        return JsonResponse({"error": "missing_fields"}, status=400)

    valid_types = {c[0] for c in CTAInquiry.TYPE_CHOICES}
    if payload["inquiry_type"] not in valid_types:
        return JsonResponse({"error": "unknown_type"}, status=400)

    result = None
    if payload.get("result_id"):
        result = Result.objects.filter(pk=payload["result_id"]).first()

    inquiry = CTAInquiry.objects.create(
        inquiry_type=payload["inquiry_type"],
        company=payload["company"],
        manager=payload["manager"],
        email=payload["email"],
        result=result,
    )

    # Email is best-effort: failure must not break inquiry persistence, but log it.
    try:
        send_inquiry_notification(inquiry)
    except Exception:
        logging.getLogger(__name__).exception(
            "Email notification failed for inquiry %s", inquiry.pk
        )

    return JsonResponse({"ok": True, "inquiry_id": inquiry.pk})
