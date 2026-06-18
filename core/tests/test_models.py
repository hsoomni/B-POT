import pytest
from core.models import Result, CTAInquiry

@pytest.mark.django_db
def test_result_defaults_and_persistence():
    r = Result.objects.create(
        track="brand",
        basic_info={"name": "씨앗가게", "category": "리테일", "target": "20대"},
        answers=[{"qid": "b1", "choice": "따뜻함", "text": "씨앗"}],
        generated={"naming": {"head": "씨앗과 햇살", "body": "따뜻함."}},
    )
    assert r.pk is not None
    assert r.created_at is not None
    assert r.basic_info["name"] == "씨앗가게"
    assert r.answers[0]["choice"] == "따뜻함"

@pytest.mark.django_db
def test_cta_inquiry_links_to_result():
    r = Result.objects.create(track="personal")
    q = CTAInquiry.objects.create(
        inquiry_type="coffeechat", company="숨니", manager="숨니",
        email="hsoomni@gmail.com", result=r,
    )
    assert q.result == r
    assert r.inquiries.count() == 1

@pytest.mark.django_db
def test_result_json_fields_default_empty():
    r = Result.objects.create(track="brand")
    assert r.basic_info == {}
    assert r.answers == []
    assert r.generated == {}
