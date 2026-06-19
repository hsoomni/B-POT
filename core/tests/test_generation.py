"""generation.py — 두 트랙 × (빈/일부/전체) 항상 6항목, 폴백 동작."""
import pytest

from core.generation import generate, josa, _has_final

BRAND_KEYS = {"naming", "mission", "core_value", "concept", "persona", "communication"}
PERSONAL_KEYS = {"naming", "mission", "core_value", "concept", "persona", "originality"}


def _valid(result, keys):
    assert set(result.keys()) == keys
    for v in result.values():
        assert v["head"] and v["body"]


def test_brand_empty():
    _valid(generate("brand", {}, []), BRAND_KEYS)


def test_personal_empty():
    _valid(generate("personal", {}, []), PERSONAL_KEYS)


def test_brand_full():
    answers = [
        {"id": "b1", "choice": "따뜻함", "text": "온기상점"},
        {"id": "b2", "choice": "부드러운"}, {"id": "b3", "choice": "지친 직장인"},
        {"id": "b4", "choice": "위로"}, {"id": "b5", "choice": "품질"},
        {"id": "b6", "choice": "첫 햇살"}, {"id": "b7", "choice": "입문·친근"},
        {"id": "b8", "choice": "다정한 친구"}, {"id": "b9", "choice": "포근함"},
        {"id": "b10", "choice": "응원", "text": "오늘도 응원합니다"},
    ]
    r = generate("brand", {"name": "온기상점"}, answers)
    _valid(r, BRAND_KEYS)
    assert r["naming"]["head"] == "“온기상점”"          # 한줄입력 우선
    assert r["communication"]["head"] == "“오늘도 응원합니다”"


def test_personal_partial():
    r = generate("personal", {"name": "수연"}, [{"id": "p1", "choice": "다정한"}])
    _valid(r, PERSONAL_KEYS)


def test_josa():
    assert josa("온기", "을", "를") == "온기를"   # 받침 없음
    assert josa("브랜드", "은", "는") == "브랜드는"  # 드: 받침 없음 → 는
    assert _has_final("집") is True
    assert _has_final("카카오") is False
