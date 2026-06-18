"""Single source of truth for B-POT question sets and result-item maps.

Each question: {id, item, prompt, options[list[str]], input(bool optional)}.
`item` is the result section the question contributes to.
Option wording is final-tunable here without touching generation logic shape.
"""

__all__ = ["QUESTIONS", "RESULT_ITEMS", "ITEM_LABELS", "get_questions"]

RESULT_ITEMS = {
    "brand": ["naming", "mission", "core_value", "concept", "persona", "communication"],
    "personal": ["naming", "mission", "core_value", "concept", "persona", "originality"],
}

# Human-facing labels for each result item (used by generation + frontend).
ITEM_LABELS = {
    "naming": "NAMING",
    "mission": "MISSION",
    "core_value": "CORE VALUE",
    "concept": "CONCEPT",
    "persona": "PERSONA",
    "communication": "COMMUNICATION SLOGAN",
    "originality": "ORIGINALITY",
}

_BRAND = [
    {"id": "b1", "item": "naming", "prompt": "브랜드가 가장 먼저 떠올리게 하고 싶은 한 단어는?",
     "options": ["따뜻함", "대담함", "정직함", "새로움"], "input": True},
    {"id": "b2", "item": "naming", "prompt": "이름이 풍겼으면 하는 톤은?",
     "options": ["부드러운", "강한", "위트있는", "클래식한"]},
    {"id": "b3", "item": "mission", "prompt": "누구의 하루를 바꾸고 싶나요?",
     "options": ["지친 직장인", "첫 시작인 사람", "나를 닮은 소수", "모두"]},
    {"id": "b4", "item": "mission", "prompt": "어떤 변화를 남기고 싶나요?",
     "options": ["위로", "자신감", "영감", "편리함"]},
    {"id": "b5", "item": "core_value", "prompt": "타협할 수 없는 단 하나의 기준은?",
     "options": ["품질", "솔직함", "지속가능성", "즐거움"], "input": True},
    {"id": "b6", "item": "concept", "prompt": "\"우리 브랜드는 ___ 같다\"",
     "options": ["든든한 베이스캠프", "첫 햇살", "오래된 단골집", "실험실"]},
    {"id": "b7", "item": "concept", "prompt": "카테고리 안에서 위치는?",
     "options": ["입문·친근", "프리미엄", "실용·합리", "실험·전위"]},
    {"id": "b8", "item": "persona", "prompt": "브랜드가 사람이라면 말투는?",
     "options": ["다정한 친구", "단단한 전문가", "장난기 동료", "조용한 안내자"]},
    {"id": "b9", "item": "persona", "prompt": "첫인상 무드는?",
     "options": ["포근함", "세련됨", "활기참", "묵직함"]},
    {"id": "b10", "item": "communication", "prompt": "한 문장으로 건네고 싶은 말의 톤은?",
     "options": ["응원", "선언", "초대", "약속"], "input": True},
]

_PERSONAL = [
    {"id": "p1", "item": "naming", "prompt": "나를 한 단어로 수식한다면?",
     "options": ["다정한", "단단한", "호기심 많은", "꾸준한"], "input": True},
    {"id": "p2", "item": "naming", "prompt": "그 수식어의 톤은?",
     "options": ["부드러운", "강한", "위트있는", "담백한"]},
    {"id": "p3", "item": "mission", "prompt": "내가 돕고 싶은 사람은?",
     "options": ["막막한 후배", "같은 길의 동료", "나를 닮은 사람", "더 넓은 세상"]},
    {"id": "p4", "item": "mission", "prompt": "남기고 싶은 변화는?",
     "options": ["용기", "영감", "실질적 도움", "즐거움"]},
    {"id": "p5", "item": "core_value", "prompt": "타협 못 하는 나의 기준은?",
     "options": ["정직", "성실", "자유", "성장"], "input": True},
    {"id": "p6", "item": "concept", "prompt": "\"나는 ___ 같은 사람\"",
     "options": ["길잡이", "첫 햇살", "든든한 동료", "끊임없는 실험가"]},
    {"id": "p7", "item": "persona", "prompt": "1년 뒤 되고 싶은 모습은?",
     "options": ["신뢰받는 전문가", "자유로운 창작자", "따뜻한 리더", "묵묵한 실력자"]},
    {"id": "p8", "item": "persona", "prompt": "사람들이 기억했으면 하는 무드는?",
     "options": ["포근함", "세련됨", "활기참", "묵직함"]},
    {"id": "p9", "item": "originality", "prompt": "남과 다른 나만의 결은?",
     "options": ["공감력", "끈기", "시선", "추진력"]},
    {"id": "p10", "item": "originality", "prompt": "한 문장으로 나를 말한다면 톤은?",
     "options": ["선언", "다짐", "초대", "고백"], "input": True},
]

QUESTIONS = {"brand": _BRAND, "personal": _PERSONAL}


def get_questions(track) -> list[dict]:
    """Return the list of question dicts for a track. Raises KeyError on unknown track."""
    return QUESTIONS[track]
