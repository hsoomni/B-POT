import pytest
from core.generation import generate, assemble, DEFAULT_BODY
from core import questions as Q

def _answers_all(track, choice_index=0):
    out = []
    for q in Q.get_questions(track):
        ans = {"qid": q["id"], "choice": q["options"][choice_index]}
        if q.get("input"):
            ans["text"] = "사용자 입력"
        out.append(ans)
    return out

@pytest.mark.parametrize("track", ["brand", "personal"])
def test_assemble_returns_all_six_items(track):
    result = assemble(track, _answers_all(track))
    assert set(result.keys()) == set(Q.RESULT_ITEMS[track])
    for item, block in result.items():
        assert block["head"].strip()
        assert block["body"].strip()
        assert block["label"] == Q.ITEM_LABELS[item]

@pytest.mark.parametrize("track", ["brand", "personal"])
def test_assemble_with_empty_answers_still_full(track):
    result = assemble(track, [])
    assert set(result.keys()) == set(Q.RESULT_ITEMS[track])
    for block in result.values():
        assert block["head"].strip()
        assert block["body"].strip()

def test_assemble_with_partial_answers():
    answers = [{"qid": "b1", "choice": "따뜻함", "text": "씨앗"}]
    result = assemble("brand", answers)
    assert set(result.keys()) == set(Q.RESULT_ITEMS["brand"])
    assert "씨앗" in result["naming"]["head"] or "씨앗" in result["naming"]["body"]

def test_generate_delegates_to_assemble():
    # No Gemini branch yet; generate() is a thin pass-through. Extended in the Gemini task.
    result = generate("brand", _answers_all("brand"))
    assert set(result.keys()) == set(Q.RESULT_ITEMS["brand"])
    for block in result.values():
        assert block["head"] and block["body"]

def test_unknown_choice_falls_back_to_default():
    answers = [{"qid": "b1", "choice": "존재하지않는선택지"}]
    result = assemble("brand", answers)
    assert result["naming"]["head"].strip()
    assert result["naming"]["body"] == DEFAULT_BODY
