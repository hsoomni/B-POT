import json
import pytest
from core.models import Result
from core import questions as Q

@pytest.mark.django_db
def test_api_questions_returns_both_tracks(client):
    resp = client.get("/api/questions/")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["brand"]) == 10
    assert len(data["personal"]) == 10
    assert data["result_items"]["brand"][0] == "naming"

@pytest.mark.django_db
def test_api_submit_creates_result_and_returns_six_items(client):
    answers = [{"qid": q["id"], "choice": q["options"][0]} for q in Q.get_questions("brand")]
    payload = {"track": "brand", "basic_info": {"name": "씨앗가게"}, "answers": answers}
    resp = client.post("/api/submit/", data=json.dumps(payload), content_type="application/json")
    assert resp.status_code == 200
    data = resp.json()
    assert set(data["generated"].keys()) == set(Q.RESULT_ITEMS["brand"])
    assert data["result_id"]
    assert Result.objects.filter(pk=data["result_id"]).exists()

@pytest.mark.django_db
def test_api_submit_rejects_unknown_track(client):
    resp = client.post("/api/submit/", data=json.dumps({"track": "nope", "answers": []}),
                       content_type="application/json")
    assert resp.status_code == 400

@pytest.mark.django_db
def test_api_submit_rejects_non_post(client):
    assert client.get("/api/submit/").status_code == 405

@pytest.mark.django_db
def test_api_submit_accepts_attachment(client, settings, tmp_path):
    from django.core.files.uploadedfile import SimpleUploadedFile
    settings.MEDIA_ROOT = tmp_path
    answers = [{"qid": q["id"], "choice": q["options"][0]} for q in Q.get_questions("brand")]
    f = SimpleUploadedFile("brief.txt", b"hello", content_type="text/plain")
    resp = client.post("/api/submit/", data={
        "payload": json.dumps({"track": "brand", "answers": answers}),
        "attachment": f,
    })  # multipart/form-data (no content_type kwarg => Django test client uses multipart)
    assert resp.status_code == 200
    rid = resp.json()["result_id"]
    assert Result.objects.get(pk=rid).attachment

@pytest.mark.django_db
def test_api_submit_rejects_bad_extension(client, settings, tmp_path):
    from django.core.files.uploadedfile import SimpleUploadedFile
    settings.MEDIA_ROOT = tmp_path
    f = SimpleUploadedFile("evil.exe", b"x", content_type="application/octet-stream")
    resp = client.post("/api/submit/", data={
        "payload": json.dumps({"track": "brand", "answers": []}),
        "attachment": f,
    })
    assert resp.status_code == 400

@pytest.mark.django_db
def test_api_submit_rejects_oversized_attachment(client, settings, tmp_path):
    from django.core.files.uploadedfile import SimpleUploadedFile
    settings.MEDIA_ROOT = tmp_path
    settings.MAX_UPLOAD_BYTES = 3  # force the size guard to trip
    f = SimpleUploadedFile("brief.txt", b"too many bytes", content_type="text/plain")
    resp = client.post("/api/submit/", data={
        "payload": json.dumps({"track": "brand", "answers": []}),
        "attachment": f,
    })
    assert resp.status_code == 400
    assert resp.json()["error"] == "too_large"
