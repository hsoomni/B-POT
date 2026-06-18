import json
import pytest
from unittest.mock import patch
from django.core import mail
from core.models import Result, CTAInquiry

@pytest.mark.django_db
def test_api_inquiry_saves_and_emails(client):
    r = Result.objects.create(track="brand")
    payload = {"inquiry_type": "coffeechat", "company": "숨니", "manager": "숨니",
               "email": "hsoomni@gmail.com", "result_id": r.pk}
    resp = client.post("/api/inquiry/", data=json.dumps(payload), content_type="application/json")
    assert resp.status_code == 200
    assert CTAInquiry.objects.filter(company="숨니", result=r).exists()
    assert len(mail.outbox) == 1
    assert "hsoomni@gmail.com" in mail.outbox[0].to

@pytest.mark.django_db
def test_api_inquiry_email_failure_is_isolated(client):
    payload = {"inquiry_type": "workshop", "company": "X", "manager": "Y",
               "email": "y@example.com"}
    with patch("core.views.send_inquiry_notification", side_effect=RuntimeError("smtp down")):
        resp = client.post("/api/inquiry/", data=json.dumps(payload), content_type="application/json")
    assert resp.status_code == 200
    assert CTAInquiry.objects.filter(company="X").exists()

@pytest.mark.django_db
def test_api_inquiry_requires_fields(client):
    resp = client.post("/api/inquiry/", data=json.dumps({"company": "X"}),
                       content_type="application/json")
    assert resp.status_code == 400
