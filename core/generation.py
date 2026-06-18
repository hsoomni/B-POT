"""B-POT result generation.

`generate()` is the public entry point. It always returns a dict of 6 result items
shaped as {item: {"label": str, "head": str, "body": str}}. Rule-based assembly is the
guaranteed fallback; Gemini polish (later task) is layered on top when a key is configured.
"""
from core import questions as Q

# Headline lead-ins per result item. {kw} is filled with the primary chosen keyword.
HEADERS = {
    "naming": "{kw}을(를) 닮은 이름",
    "mission": "{kw}을(를) 향한 마음",
    "core_value": "{kw}, 타협하지 않는 기준",
    "concept": "{kw} 같은 시작점",
    "persona": "{kw}의 얼굴",
    "communication": "한 문장으로, {kw}",
    "originality": "나만의 결: {kw}",
}

# Supporting copy fragment per (item, option). Missing keys fall back to DEFAULT_BODY.
OPTION_FRAGMENTS = {
    ("naming", "따뜻함"): "처음 만난 사람에게도 온기가 느껴지도록.",
    ("naming", "대담함"): "주저 없이 한 발 앞서 나가도록.",
    ("naming", "정직함"): "꾸미지 않아도 신뢰가 쌓이도록.",
    ("naming", "새로움"): "익숙함 속에서도 신선하게 떠오르도록.",
    ("mission", "지친 직장인"): "하루의 끝에서 한숨 돌릴 자리를 만든다.",
    ("mission", "첫 시작인 사람"): "막 출발하는 사람의 등을 가만히 민다.",
    ("mission", "나를 닮은 소수"): "같은 결을 가진 사람들에게 깊이 닿는다.",
    ("mission", "모두"): "더 많은 사람의 하루에 작은 변화를 더한다.",
    ("mission", "위로"): "지친 마음에 위로를 건넨다.",
    ("mission", "자신감"): "스스로를 믿게 하는 자신감을 심는다.",
    ("mission", "영감"): "다음 한 걸음의 영감을 준다.",
    ("mission", "편리함"): "번거로움을 덜어 일상을 가볍게 한다.",
    ("core_value", "품질"): "보이지 않는 곳까지 타협하지 않는다.",
    ("core_value", "솔직함"): "좋은 것도 부족한 것도 있는 그대로 말한다.",
    ("core_value", "지속가능성"): "오래 가는 선택을 가장 앞에 둔다.",
    ("core_value", "즐거움"): "과정마저 즐거운 경험을 고집한다.",
    ("concept", "든든한 베이스캠프"): "언제든 돌아와 다시 출발하는 거점.",
    ("concept", "첫 햇살"): "하루를 여는 첫 빛 같은 시작점.",
    ("concept", "오래된 단골집"): "익숙하고 편안한, 늘 그 자리의 존재.",
    ("concept", "실험실"): "끊임없이 시도하고 다시 빚는 공간.",
    ("persona", "다정한 친구"): "곁에서 조용히 응원하는 말투로 다가간다.",
    ("persona", "단단한 전문가"): "군더더기 없이 신뢰를 주는 태도로 말한다.",
    ("persona", "장난기 동료"): "가볍고 유쾌한 결로 거리를 좁힌다.",
    ("persona", "조용한 안내자"): "한 발 물러서 길을 비추는 목소리로 안내한다.",
    ("communication", "응원"): "당신의 시작을 진심으로 응원한다는 마음.",
    ("communication", "선언"): "우리가 누구인지 분명히 선언하는 목소리.",
    ("communication", "초대"): "함께하자고 손 내미는 다정한 초대.",
    ("communication", "약속"): "변하지 않을 약속을 건네는 단단함.",
    ("originality", "공감력"): "남의 마음을 먼저 읽는 결.",
    ("originality", "끈기"): "끝까지 놓지 않는 끈기의 결.",
    ("originality", "시선"): "남과 다른 각도로 바라보는 시선.",
    ("originality", "추진력"): "생각을 곧장 움직임으로 옮기는 힘.",
}

DEFAULT_BODY = "당신이 고른 선택이 이 항목의 첫 씨앗이 됩니다."


def _answers_by_item(track, answers):
    """Group answer dicts by their question's result item."""
    qindex = {q["id"]: q for q in Q.get_questions(track)}
    grouped = {item: [] for item in Q.RESULT_ITEMS[track]}
    for a in answers or []:
        q = qindex.get(a.get("qid"))
        if not q:
            continue
        grouped[q["item"]].append(a)
    return grouped


def _head_for(item, group):
    """Pick the keyword (free-text input beats choice, else '당신') and format the headline."""
    choices = [a.get("choice") for a in group if a.get("choice")]
    texts = [a.get("text") for a in group if a.get("text")]
    kw = (texts[0] if texts else (choices[0] if choices else "당신")).strip() or "당신"
    return HEADERS.get(item, "{kw}").format(kw=kw)


def _body_for(item, group):
    """Join the matched copy fragments (max 3); DEFAULT_BODY when none match."""
    parts = []
    for a in group:
        frag = OPTION_FRAGMENTS.get((item, a.get("choice")))
        if frag:
            parts.append(frag)
    if not parts:
        parts.append(DEFAULT_BODY)
    # up to 2 fragments today; cap at 3 for safety.
    return " ".join(parts[:3])


def assemble(track, answers, basic_info=None):
    """Rule-based 6-item assembly. Always returns full output for the track."""
    grouped = _answers_by_item(track, answers)
    out = {}
    for item in Q.RESULT_ITEMS[track]:
        group = grouped[item]
        out[item] = {
            "label": Q.ITEM_LABELS[item],
            "head": _head_for(item, group),
            "body": _body_for(item, group),
        }
    return out


def generate(track, answers, basic_info=None):
    """Public entry. Assembly fallback now; Gemini polish layered in a later task."""
    return assemble(track, answers, basic_info)
