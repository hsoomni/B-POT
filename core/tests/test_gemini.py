import pytest
from unittest.mock import patch
from core import generation
from core import questions as Q

def _answers(track):
    return [{"qid": q["id"], "choice": q["options"][0]} for q in Q.get_questions(track)]

def test_polish_used_when_key_set(settings):
    settings.GEMINI_API_KEY = "fake-key"
    polished = {item: {"label": Q.ITEM_LABELS[item], "head": "P", "body": "Q"}
               for item in Q.RESULT_ITEMS["brand"]}
    with patch.object(generation, "_polish", return_value=polished) as mp:
        result = generation.generate("brand", _answers("brand"), {"name": "X"})
    mp.assert_called_once()
    call_args = mp.call_args.args
    assert call_args[0] == "brand"
    assert call_args[2] == {"name": "X"}
    assert result["naming"]["head"] == "P"

def test_polish_failure_falls_back_to_assembly(settings):
    settings.GEMINI_API_KEY = "fake-key"
    with patch.object(generation, "_polish", side_effect=RuntimeError("boom")):
        result = generation.generate("brand", _answers("brand"))
    assert set(result.keys()) == set(Q.RESULT_ITEMS["brand"])
    for block in result.values():
        assert block["head"] and block["body"]

def test_no_key_skips_polish(settings):
    settings.GEMINI_API_KEY = ""
    with patch.object(generation, "_polish") as mp:
        generation.generate("brand", _answers("brand"))
    mp.assert_not_called()
