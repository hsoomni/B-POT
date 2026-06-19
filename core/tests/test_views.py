import json

import pytest
from django.test import Client

from core.models import Result, CTAInquiry

pytestmark = pytest.mark.django_db


def _post(client, url, body):
    return client.post(url, data=json.dumps(body), content_type="application/json")


def test_index_serves_bootstrap(client):
    resp = client.get("/")
    assert resp.status_code == 200
    assert b'id="bpot-data"' in resp.content


def test_submit_creates_result():
    c = Client()
    resp = _post(c, "/api/submit", {
        "track": "brand", "basic_info": {"name": "테스트"},
        "answers": [{"id": "b1", "choice": "따뜻함"}],
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["ok"] is True
    assert len(data["generated"]) == 6
    assert Result.objects.count() == 1


def test_submit_invalid_track():
    c = Client()
    resp = _post(c, "/api/submit", {"track": "nope", "answers": []})
    assert resp.status_code == 400
    assert resp.json()["ok"] is False


def test_inquiry_saves_and_email_isolated(settings):
    settings.EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
    c = Client()
    resp = _post(c, "/api/inquiry", {
        "inquiry_type": "coffeechat", "company": "C", "email": "a@b.com",
    })
    assert resp.status_code == 200
    assert CTAInquiry.objects.count() == 1


def test_inquiry_requires_email():
    c = Client()
    resp = _post(c, "/api/inquiry", {"company": "C"})
    assert resp.status_code == 400
