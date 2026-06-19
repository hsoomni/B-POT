"""결과 6항목 생성.

1) 조립(fallback): 선택지에 매핑된 카피 조각을 규칙 기반으로 조합.
   입력이 비어도 항상 유효한 6항목을 산출한다.
2) AI 다듬기(선택): GEMINI_API_KEY 가 있으면 톤/문장만 다듬는다.
   CTA 연락처 등 개인정보는 전송하지 않는다(여기 함수는 답변·기본정보만 받음).
3) 폴백 보장: AI 실패/타임아웃 시 조립 결과를 그대로 반환.
"""
from __future__ import annotations

import json
import logging

from django.conf import settings

logger = logging.getLogger(__name__)


def _has_final(word):
    """마지막 글자에 받침(종성)이 있으면 True."""
    if not word:
        return False
    ch = word[-1]
    if "\uac00" <= ch <= "\ud7a3":  # 한글 음절
        return (ord(ch) - 0xAC00) % 28 != 0
    # 한글이 아니면 보수적으로 받침 없음 취급
    return False


def josa(word, with_final, without_final):
    """word 받침 유무에 따라 조사 선택. 예: josa('온기','을','를') -> '를'."""
    return word + (with_final if _has_final(word) else without_final)


# ── 매핑 사전 ──────────────────────────────────────────────────────────────
def _answer_map(answers):
    out = {}
    for a in answers or []:
        if isinstance(a, dict) and a.get("id"):
            out[a["id"]] = a
    return out


def _choices(amap, qid):
    a = amap.get(qid) or {}
    cs = a.get("choices")
    if isinstance(cs, list) and cs:
        return [c for c in cs if c]
    c = a.get("choice")
    return [c] if c else []


def _choice(amap, qid):
    """대표(첫) 선택. 본문 문장은 대표 선택으로 매끄럽게 유지."""
    cs = _choices(amap, qid)
    return cs[0] if cs else ""


def _text(amap, qid):
    return ((amap.get(qid) or {}).get("text") or "").strip()


# ── 좋아하는 컬러 → 포인트 색 + 형용사 ──────────────────────────────────────
COLOR_MAP = [
    (("오렌지", "주황"), ("에너지 가득한", "#F2A20C", "오렌지", "상큼한 비타민")),
    (("코랄",), ("따뜻한", "#E8552D", "코랄", "따뜻한 노을")),
    (("레드", "빨강", "빨간"), ("강렬한", "#E24B4A", "레드", "타오르는 불꽃")),
    (("골드",), ("빛나는", "#E0A91B", "골드", "빛나는 별")),
    (("옐로", "노랑", "노란"), ("밝고 경쾌한", "#F2B90F", "옐로", "환한 햇살")),
    (("올리브",), ("단단하고 자연스러운", "#7D8C3F", "올리브", "단단한 나무")),
    (("민트",), ("산뜻한", "#5DC9A8", "민트", "산뜻한 바람")),
    (("그린", "초록", "녹색"), ("단단하고 자연스러운", "#5DAA3C", "그린", "싱그러운 새싹")),
    (("틸", "청록"), ("시원하고 균형 잡힌", "#3FA9A0", "틸", "맑은 호수")),
    (("네이비", "남색"), ("깊고 차분한", "#2C4A6E", "네이비", "깊은 바다")),
    (("스카이", "하늘"), ("맑고 시원한", "#5AAEE0", "스카이블루", "탁 트인 하늘")),
    (("블루", "파랑", "파란"), ("신뢰감 있는", "#378ADD", "블루", "잔잔한 바다")),
    (("퍼플", "보라"), ("영감 가득한", "#8A6FE0", "퍼플", "영감을 주는 별빛")),
    (("핑크", "분홍"), ("다정한", "#E8557D", "핑크", "다정한 봄꽃")),
    (("베이지",), ("포근한", "#C9A876", "베이지", "포근한 모래")),
    (("브라운", "갈색"), ("편안한", "#8A5A33", "브라운", "단단한 대지")),
    (("그레이", "회색"), ("차분한", "#8A8F92", "그레이", "차분한 안개")),
    (("블랙", "검정", "검은"), ("묵직한", "#2A2A2A", "블랙", "묵직한 밤하늘")),
    (("화이트", "하양", "흰", "백색"), ("담백한", "#9AA7AD", "화이트", "담백한 도화지")),
]


def color_accent(text):
    """좋아하는 컬러 텍스트에서 첫 매칭 색을 찾아 {adj, hex, display} 반환. 없으면 None."""
    t = (text or "").strip()
    if not t:
        return None
    for keys, (adj, hex_, display, metaphor) in COLOR_MAP:
        for k in keys:
            if k in t:
                return {"adj": adj, "hex": hex_, "display": display, "metaphor": metaphor}
    return None


# ── 브랜드 트랙 ────────────────────────────────────────────────────────────
def generate_brand(basic_info, answers):
    a = _answer_map(answers)
    name = (basic_info or {}).get("name") or "이 브랜드"
    name_t, name_o = josa(name, "은", "는"), josa(name, "을", "를")

    kw = {"따뜻함": "온기", "대담함": "담대함", "정직함": "솔직함", "새로움": "혁신", "즐거움": "유쾌함", "전문성": "전문성", "신뢰": "믿음", "자유로움": "자유로움", "섬세함": "섬세함"}
    tone = {"부드러운": "부드럽고 따뜻한 언어로", "강한": "힘 있고 선명한 언어로",
            "위트있는": "유쾌하고 위트 있는 언어로", "클래식한": "단단하고 클래식한 언어로",
            "모던한": "깔끔하고 모던한 언어로", "감성적인": "감성을 자극하는 언어로", "차분한": "차분하고 단정한 언어로", "경쾌한": "밝고 경쾌한 언어로", "고급스러운": "우아하고 고급스러운 언어로"}
    who = {"지친 직장인": "지친 오늘을 보내는 사람들", "처음 시작하는 사람": "처음을 시작하는 사람들",
           "나를 닮은 소수": "나를 닮은 소수의 사람들", "모두": "모든 사람",
           "바쁜 부모": "바쁜 하루를 사는 부모들", "꿈꾸는 청년": "꿈을 향해 가는 청년들", "혼자 일하는 사람": "혼자 일하는 사람들", "새로움을 찾는 사람": "새로움을 찾는 사람들", "일상이 지루한 사람": "일상이 지루한 사람들"}
    change = {"위로": "위로와 공감을 전한다", "자신감": "자신감과 용기를 심는다",
              "영감": "새로운 영감을 불러일으킨다", "편리함": "더 나은 일상을 만든다",
              "즐거움": "즐거움과 활기를 더한다", "연결": "사람과 사람을 잇는다", "성장": "성장을 돕는다", "여유": "여유를 선물한다", "설렘": "설렘을 안긴다"}
    change_fp = {"위로": "위로와 공감을 전합니다", "자신감": "자신감과 용기를 심습니다",
                 "영감": "새로운 영감을 불러일으킵니다", "편리함": "더 나은 일상을 만듭니다",
                 "즐거움": "즐거움과 활기를 더합니다", "연결": "사람과 사람을 잇습니다", "성장": "성장을 돕습니다", "여유": "여유를 선물합니다", "설렘": "설렘을 안깁니다"}
    cv = {"품질": "타협 없는 품질", "솔직함": "날것의 솔직함",
          "지속가능성": "오래가는 진심", "즐거움": "언제나 즐거움",
          "혁신": "멈추지 않는 혁신", "신뢰": "흔들리지 않는 신뢰", "디테일": "작은 디테일", "고객 중심": "언제나 고객 중심", "개성": "또렷한 개성"}
    metaphor = {"든든한 베이스캠프": "든든한 베이스캠프처럼", "첫 햇살": "하루를 여는 첫 햇살처럼",
                "오래된 단골집": "오래된 단골집처럼", "끊임없는 실험실": "계속 실험하는 실험실처럼",
                "포근한 담요": "포근한 담요처럼", "길잡이 등대": "길을 밝히는 등대처럼", "비밀 아지트": "나만의 비밀 아지트처럼", "따뜻한 화로": "따뜻한 화로처럼", "맑은 새벽 공기": "맑은 새벽 공기처럼"}
    pos = {"입문·친근": "누구나 쉽게 다가올 수 있는", "프리미엄": "특별한 경험을 제공하는",
           "실용·합리": "실용적이고 합리적인", "실험·전위": "경계를 넘는 실험적인",
           "트렌디·감각": "트렌디하고 감각적인", "클래식·정통": "클래식하고 정통적인", "니치·전문": "좁고 깊은 전문적인", "대중·친숙": "누구에게나 친숙한", "혁신·리딩": "앞서가며 이끄는"}
    talk = {"다정한 친구": "다정한 친구처럼 말을 건네는", "단단한 전문가": "단단하고 신뢰감 있는",
            "장난기 있는 동료": "위트 있고 유쾌한", "조용한 안내자": "조용하지만 확신 있는",
            "열정적인 코치": "열정적으로 이끄는", "센스있는 큐레이터": "센스 있게 골라주는", "담백한 이웃": "담백하게 곁을 지키는", "영리한 파트너": "영리하게 함께 풀어가는", "따뜻한 멘토": "따뜻하게 이끄는"}
    mood = {"포근함": "포근함", "세련됨": "세련됨", "활기참": "활기참", "묵직함": "묵직함", "산뜻함": "산뜻함", "고급스러움": "고급스러움", "단정함": "단정함", "자유로움": "자유로움", "따뜻함": "따뜻함"}
    comm = {"응원": "당신을 응원합니다", "선언": "우리는 이렇게 존재합니다",
            "초대": "함께 가지 않겠어요?", "약속": "우리가 반드시 지키겠습니다",
            "위로": "당신은 혼자가 아닙니다", "공감": "그 마음, 잘 알아요", "감사": "당신 덕분입니다", "질문": "어떤 하루를 보내고 있나요?", "다짐": "우리, 이렇게 해나갈게요"}

    v_kw = kw.get(_choice(a, "b1"), "진심")
    v_tone = tone.get(_choice(a, "b2"), "감각적인 언어로")
    v_who = who.get(_choice(a, "b3"), "사람들")
    v_change = change.get(_choice(a, "b4"), "의미 있는 변화를 만든다")
    v_change_fp = change_fp.get(_choice(a, "b4"), "의미 있는 변화를 만듭니다")
    v_cv = _text(a, "b5") or cv.get(_choice(a, "b5"), "우리만의 기준")
    v_metaphor = metaphor.get(_choice(a, "b6"), "특별한 존재처럼")
    v_pos = pos.get(_choice(a, "b7"), "독자적인")
    v_talk = talk.get(_choice(a, "b8"), "진정성 있는")
    v_mood = mood.get(_choice(a, "b9"), "진중함")
    v_comm = comm.get(_choice(a, "b10"), "진심 어린 메시지")
    t1, t10 = _text(a, "b1"), _text(a, "b10")

    return {
        "naming": {
            "head": f"“{t1}”" if t1 else josa(v_kw, "을", "를") + " 담은 이름",
            "body": f"{name_t} " + josa(v_kw, "을", "를") + " 담은 이름입니다.",
        },
        "mission": {
            "head": f"{v_who}에게 {v_change}",
            "body": f"우리는 {v_who}에게 {v_change_fp}.",
        },
        "core_value": {
            "head": v_cv,
            "body": f"어떤 순간에도 {v_cv}만큼은 지킵니다.",
        },
        "concept": {
            "head": f"{v_pos} 브랜드",
            "body": f"우리는 {v_metaphor} 고객의 곁에 머뭅니다.",
        },
        "persona": {
            "head": f"{v_mood}이 흐르는 브랜드",
            "body": f"{v_talk} 목소리로, 첫 만남부터 " + josa(v_mood, "을", "를") + " 건넵니다.",
        },
        "communication": {
            "head": f"“{t10}”" if t10 else v_comm,
            "body": f"그래서 우리의 모든 말은 ‘{t10 or v_comm}’에서 시작됩니다.",
        },
    }


# ── 개인 트랙 ──────────────────────────────────────────────────────────────
def generate_personal(basic_info, answers):
    a = _answer_map(answers)
    name = (basic_info or {}).get("name") or "나"
    name_t, name_o = josa(name, "은", "는"), josa(name, "을", "를")

    adj = {"다정한": "다정한", "단단한": "단단한", "호기심 많은": "호기심 많은", "꾸준한": "꾸준한", "유쾌한": "유쾌한", "섬세한": "섬세한", "차분한": "차분한", "당찬": "당찬", "따뜻한": "따뜻한"}
    tone = {"부드러운": "부드럽게", "강한": "힘 있게", "위트있는": "위트 있게", "담백한": "담백하게", "차분한": "차분하게", "경쾌한": "경쾌하게", "단단한": "단단하게", "감성적인": "감성적으로", "산뜻한": "산뜻하게"}
    who = {"막막한 후배": "막막한 후배들", "같은 길의 동료": "같은 길을 걷는 동료들",
           "나를 닮은 사람": "나를 닮은 사람들", "더 넓은 세상": "더 넓은 세상",
           "지친 누군가": "지친 누군가", "함께할 팀": "함께할 팀원들", "길을 찾는 사람": "길을 찾는 사람들", "꿈꾸는 사람": "꿈꾸는 사람들", "곁의 소중한 사람": "곁의 소중한 사람들"}
    change = {"용기": "용기를 심는다", "영감": "영감을 불어넣는다",
              "실질적 도움": "실질적인 도움을 준다", "즐거움": "즐거움을 더한다",
              "성장": "성장을 돕는다", "위로": "따뜻한 위로를 전한다", "자신감": "자신감을 심는다", "설렘": "설렘을 안긴다", "편안함": "편안함을 준다"}
    change_fp = {"용기": "용기를 심습니다", "영감": "영감을 불어넣습니다",
                 "실질적 도움": "실질적인 도움을 드립니다", "즐거움": "즐거움을 더합니다",
                 "성장": "성장을 돕습니다", "위로": "따뜻한 위로를 전합니다", "자신감": "자신감을 심습니다", "설렘": "설렘을 안깁니다", "편안함": "편안함을 줍니다"}
    cv = {"정직": "언제나 정직함", "성실": "꾸준한 성실함", "자유": "자유로운 사고", "성장": "끊임없는 성장", "도전": "두려움 없는 도전", "배려": "세심한 배려", "책임": "끝까지 책임", "호기심": "멈추지 않는 호기심", "균형": "흔들림 없는 균형"}
    concept = {"길잡이": "길을 잃은 이에게 방향을 가리키는 길잡이", "첫 햇살": "하루를 새롭게 여는 첫 햇살",
               "든든한 동료": "어깨를 내어주는 든든한 동료", "끊임없는 실험가": "경계를 허무는 끊임없는 실험가",
               "단단한 뿌리": "흔들려도 다시 서는 단단한 뿌리", "따뜻한 난로": "곁을 데우는 따뜻한 난로", "잔잔한 호수": "누구든 비추는 잔잔한 호수", "바람 같은 자유인": "어디에도 매이지 않는 바람 같은 자유인", "꾸준한 농부": "매일을 일구는 꾸준한 농부"}
    future = {"신뢰받는 전문가": "신뢰받는 전문가", "자유로운 창작자": "자유로운 창작자",
              "따뜻한 리더": "따뜻한 리더", "묵묵한 실력자": "묵묵한 실력자",
              "영향력 있는 사람": "영향력 있는 사람", "꾸준한 성장가": "꾸준히 성장하는 사람", "단단한 1인 브랜드": "단단한 1인 브랜드", "영감을 주는 사람": "영감을 주는 사람", "균형 잡힌 사람": "균형 잡힌 사람"}
    mood = {"포근함": "포근함", "세련됨": "세련됨", "활기참": "활기참", "묵직함": "묵직함", "산뜻함": "산뜻함", "단단함": "단단함", "자유로움": "자유로움", "다정함": "다정함", "당당함": "당당함"}
    strength = {"공감력": "깊은 공감력", "끈기": "남다른 끈기", "시선": "독특한 시선", "추진력": "강한 추진력", "창의력": "번뜩이는 창의력", "집중력": "깊은 집중력", "실행력": "빠른 실행력", "균형감": "흔들림 없는 균형감", "진정성": "꾸밈없는 진정성"}
    orig_tone = {"선언": "당당한 선언으로", "다짐": "진심 어린 다짐으로",
                 "초대": "따뜻한 초대로", "고백": "솔직한 고백으로",
                 "질문": "호기심 어린 질문으로", "약속": "단단한 약속으로", "응원": "따뜻한 응원으로", "감사": "진심 어린 감사로", "위로": "조용한 위로로"}

    v_adj = adj.get(_choice(a, "p1"), "특별한")
    v_tone = tone.get(_choice(a, "p2"), "담백하게")
    v_who = who.get(_choice(a, "p3"), "사람들")
    v_change = change.get(_choice(a, "p4"), "의미 있는 변화를 만든다")
    v_change_fp = change_fp.get(_choice(a, "p4"), "의미 있는 변화를 만듭니다")
    v_cv = _text(a, "p5") or cv.get(_choice(a, "p5"), "나만의 기준")
    v_concept = concept.get(_choice(a, "p6"), "자신만의 색을 가진 사람")
    v_future = future.get(_choice(a, "p7"), "성장하는 나")
    v_mood = mood.get(_choice(a, "p8"), "진중함")
    v_strength = strength.get(_choice(a, "p9"), "나만의 강점")
    v_orig = orig_tone.get(_choice(a, "p10"), "진심으로")
    t1, t10 = _text(a, "p1"), _text(a, "p10")
    accent = color_accent((basic_info or {}).get("category"))   # 좋아하는 컬러
    heard_raw = ((basic_info or {}).get("target") or "").strip()  # 자주 듣는 말
    heard = heard_raw.split(",")[0].split("·")[0].strip() if heard_raw else ""
    mod = t1 or v_adj   # 수식어

    # 받침글(body)을 위→아래로 이어 읽으면 1인칭 자기소개가 되도록 구성.
    # head 는 짧은 키워드 라벨(결과지·3D 비주얼에서 함께 사용).
    orig_parts = []
    if heard:
        orig_parts.append(f"사람들은 제게 ‘{heard}’라고 말합니다.")
    if accent:
        orig_parts.append(f"{v_orig} 다가가, 함께한다면 {accent['metaphor']} 같은 사람이 되겠습니다.")
    else:
        orig_parts.append(f"{josa(v_strength, '은', '는')} 저만의 결입니다. {v_orig} 세상에 내보입니다.")

    return {
        "naming": {
            "head": (f"‘{t1}’ {name}" if t1 else f"{v_adj} {name}"),
            "body": f"저는 {mod} {name}입니다.",
        },
        "mission": {
            "head": v_change,
            "body": f"그래서 {v_who}에게 {v_tone} {v_change_fp}.",
        },
        "core_value": {
            "head": v_cv,
            "body": f"어떤 상황에서도 {v_cv}만큼은 지켜갑니다.",
        },
        "concept": {
            "head": v_concept,
            "body": f"그렇게 저는 {josa(v_concept, '이', '가')} 되어갑니다.",
        },
        "persona": {
            "head": v_future,
            "body": f"1년 뒤엔 " + josa(v_future, "으로", "로") + f", {josa(v_mood, '을', '를')} 잃지 않으며 나아갈 거예요.",
        },
        "originality": {
            "head": (f"“{t10}”" if t10 else v_strength),
            "body": " ".join(orig_parts),
        },
    }

# ── 공개 진입점 ────────────────────────────────────────────────────────────
def generate(track, basic_info, answers):
    base = generate_brand(basic_info, answers) if track == "brand" \
        else generate_personal(basic_info, answers)
    if settings.GEMINI_API_KEY:
        try:
            return _refine_with_gemini(track, basic_info, base)
        except Exception as exc:  # noqa: BLE001 — 폴백 보장
            logger.warning("Gemini 다듬기 실패, 조립 결과로 폴백: %s", exc)
    return base


def _refine_with_gemini(track, basic_info, base):
    """조립 결과를 Gemini로 톤만 다듬는다. 실패 시 예외 → 상위에서 폴백."""
    import requests

    safe_info = {k: (basic_info or {}).get(k, "") for k in ("name", "category", "target")}
    prompt = (
        "다음은 브랜딩 진단 결과 6항목(JSON)입니다. 각 항목의 head(헤드라인)와 "
        "body(받침 2~3줄)의 '톤과 문장만' 더 자연스럽고 감각적으로 다듬어 주세요. "
        "의미·구조·키는 바꾸지 말고, 한국어로, 같은 JSON 형식으로만 답하세요.\n"
        f"기본정보: {json.dumps(safe_info, ensure_ascii=False)}\n"
        f"결과: {json.dumps(base, ensure_ascii=False)}"
    )
    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        "gemini-1.5-flash:generateContent?key=" + settings.GEMINI_API_KEY
    )
    resp = requests.post(
        url,
        json={"contents": [{"parts": [{"text": prompt}]}],
              "generationConfig": {"temperature": 0.7, "response_mime_type": "application/json"}},
        timeout=8,
    )
    resp.raise_for_status()
    text = resp.json()["candidates"][0]["content"]["parts"][0]["text"]
    refined = json.loads(text)
    # 구조 검증: 모든 키가 유지되고 head/body 가 있어야 채택
    for key, val in base.items():
        rv = refined.get(key)
        if not isinstance(rv, dict) or "head" not in rv or "body" not in rv:
            raise ValueError(f"refined 결과에 '{key}' 누락")
    return refined
