import pytest
from core import questions as Q

def test_two_tracks_each_have_ten_questions():
    assert len(Q.get_questions("brand")) == 10
    assert len(Q.get_questions("personal")) == 10

def test_unknown_track_raises():
    with pytest.raises(KeyError):
        Q.get_questions("nope")

def test_every_question_has_required_fields():
    for track in ("brand", "personal"):
        for q in Q.get_questions(track):
            assert q["id"]
            assert q["item"] in Q.RESULT_ITEMS[track]
            assert q["prompt"]
            assert isinstance(q["options"], list) and len(q["options"]) >= 2
            assert isinstance(q.get("input", False), bool)

def test_question_ids_unique_per_track():
    for track in ("brand", "personal"):
        ids = [q["id"] for q in Q.get_questions(track)]
        assert len(ids) == len(set(ids))

def test_result_items_have_six_each():
    assert len(Q.RESULT_ITEMS["brand"]) == 6
    assert len(Q.RESULT_ITEMS["personal"]) == 6

def test_input_flag_on_expected_cards():
    expected = {
        "brand": {"naming", "core_value", "communication"},
        "personal": {"naming", "core_value", "originality"},
    }
    for track in ("brand", "personal"):
        input_items = {q["item"] for q in Q.get_questions(track) if q.get("input")}
        assert input_items == expected[track]


def test_item_labels_cover_all_used_items():
    used = {q["item"] for track in ("brand", "personal") for q in Q.get_questions(track)}
    assert used <= set(Q.ITEM_LABELS), f"missing labels for: {used - set(Q.ITEM_LABELS)}"
