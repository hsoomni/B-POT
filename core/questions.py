"""B-POT 질문 세트 — 단일 출처 (Single source of truth).

각 문항: {id, item, prompt, options[9], has_input?, input_placeholder?}
선택은 복수 선택(여러 개) 가능. 화면은 3×3 균일 버튼.
"""

BRAND_ITEMS = [
    ("naming", "NAMING", "#E8552D"),
    ("mission", "MISSION", "#F2A20C"),
    ("core_value", "CORE VALUE", "#F2B90F"),
    ("concept", "CONCEPT", "#5DAA3C"),
    ("persona", "PERSONA", "#3FA9A0"),
    ("communication", "COMMUNICATION SLOGAN", "#E8552D"),
]
PERSONAL_ITEMS = [
    ("naming", "NAMING", "#E8552D"),
    ("mission", "MISSION", "#F2A20C"),
    ("core_value", "CORE VALUE", "#F2B90F"),
    ("concept", "CONCEPT", "#5DAA3C"),
    ("persona", "PERSONA", "#3FA9A0"),
    ("originality", "ORIGINALITY", "#3FA9A0"),
]

BRAND_QUESTIONS = [
    {"id": "b1", "item": "naming",
     "prompt": "브랜드가 먼저 떠올리게 하고 싶은 느낌은 무엇인가요?",
     "options": ["따뜻함", "대담함", "정직함", "새로움", "즐거움", "전문성", "신뢰", "자유로움", "섬세함"],
     "has_input": True, "input_placeholder": "내 단어로 직접 적어주세요"},
    {"id": "b2", "item": "naming",
     "prompt": "이름이 풍겼으면 하는 톤은 어떤가요?",
     "options": ["부드러운", "강한", "위트있는", "클래식한", "모던한", "감성적인", "차분한", "경쾌한", "고급스러운"]},
    {"id": "b3", "item": "mission",
     "prompt": "누구의 하루를 바꾸고 싶나요?",
     "options": ["지친 직장인", "처음 시작하는 사람", "나를 닮은 소수", "모두", "바쁜 부모", "꿈꾸는 청년", "혼자 일하는 사람", "새로움을 찾는 사람", "일상이 지루한 사람"]},
    {"id": "b4", "item": "mission",
     "prompt": "그들에게 어떤 변화를 남기고 싶나요?",
     "options": ["위로", "자신감", "영감", "편리함", "즐거움", "연결", "성장", "여유", "설렘"]},
    {"id": "b5", "item": "core_value",
     "prompt": "타협할 수 없는 기준은 무엇인가요?",
     "options": ["품질", "솔직함", "지속가능성", "즐거움", "혁신", "신뢰", "디테일", "고객 중심", "개성"],
     "has_input": True, "input_placeholder": "내 단어로 직접 적어주세요"},
    {"id": "b6", "item": "concept",
     "prompt": "우리 브랜드를 무언가에 비유한다면 어떤 모습인가요?",
     "options": ["든든한 베이스캠프", "첫 햇살", "오래된 단골집", "끊임없는 실험실", "포근한 담요", "길잡이 등대", "비밀 아지트", "따뜻한 화로", "맑은 새벽 공기"]},
    {"id": "b7", "item": "concept",
     "prompt": "카테고리 안에서 어떤 위치에 있나요?",
     "options": ["입문·친근", "프리미엄", "실용·합리", "실험·전위", "트렌디·감각", "클래식·정통", "니치·전문", "대중·친숙", "혁신·리딩"]},
    {"id": "b8", "item": "persona",
     "prompt": "브랜드가 사람이라면 어떤 말투인가요?",
     "options": ["다정한 친구", "단단한 전문가", "장난기 있는 동료", "조용한 안내자", "열정적인 코치", "센스있는 큐레이터", "담백한 이웃", "영리한 파트너", "따뜻한 멘토"]},
    {"id": "b9", "item": "persona",
     "prompt": "첫인상의 무드는 어떤가요?",
     "options": ["포근함", "세련됨", "활기참", "묵직함", "산뜻함", "고급스러움", "단정함", "자유로움", "따뜻함"]},
    {"id": "b10", "item": "communication",
     "prompt": "한 문장으로 건네고 싶은 말은 어떤 톤인가요?",
     "options": ["응원", "선언", "초대", "약속", "위로", "공감", "감사", "질문", "다짐"],
     "has_input": True, "input_placeholder": "내 단어로 직접 적어주세요"},
]

PERSONAL_QUESTIONS = [
    {"id": "p1", "item": "naming",
     "prompt": "나와 가장 어울리는 수식어는 무엇인가요?",
     "options": ["다정한", "단단한", "호기심 많은", "꾸준한", "유쾌한", "섬세한", "차분한", "당찬", "따뜻한"],
     "has_input": True, "input_placeholder": "내 단어로 직접 적어주세요"},
    {"id": "p2", "item": "naming",
     "prompt": "그 수식어가 풍겼으면 하는 톤은 어떤가요?",
     "options": ["부드러운", "강한", "위트있는", "담백한", "차분한", "경쾌한", "단단한", "감성적인", "산뜻한"]},
    {"id": "p3", "item": "mission",
     "prompt": "내가 돕고 싶은 사람은 누구인가요?",
     "options": ["막막한 후배", "같은 길의 동료", "나를 닮은 사람", "더 넓은 세상", "지친 누군가", "함께할 팀", "길을 찾는 사람", "꿈꾸는 사람", "곁의 소중한 사람"]},
    {"id": "p4", "item": "mission",
     "prompt": "그들에게 어떤 변화를 남기고 싶나요?",
     "options": ["용기", "영감", "실질적 도움", "즐거움", "성장", "위로", "자신감", "설렘", "편안함"]},
    {"id": "p5", "item": "core_value",
     "prompt": "타협할 수 없는 나의 기준은 무엇인가요?",
     "options": ["정직", "성실", "자유", "성장", "도전", "배려", "책임", "호기심", "균형"],
     "has_input": True, "input_placeholder": "내 단어로 직접 적어주세요"},
    {"id": "p6", "item": "concept",
     "prompt": "나를 무언가에 비유한다면 어떤 모습인가요?",
     "options": ["길잡이", "첫 햇살", "든든한 동료", "끊임없는 실험가", "단단한 뿌리", "따뜻한 난로", "잔잔한 호수", "바람 같은 자유인", "꾸준한 농부"]},
    {"id": "p7", "item": "persona",
     "prompt": "1년 뒤 어떤 사람이 되고 싶나요?",
     "options": ["신뢰받는 전문가", "자유로운 창작자", "따뜻한 리더", "묵묵한 실력자", "영향력 있는 사람", "꾸준한 성장가", "단단한 1인 브랜드", "영감을 주는 사람", "균형 잡힌 사람"]},
    {"id": "p8", "item": "persona",
     "prompt": "사람들이 기억했으면 하는 무드는 어떤가요?",
     "options": ["포근함", "세련됨", "활기참", "묵직함", "산뜻함", "단단함", "자유로움", "다정함", "당당함"]},
    {"id": "p9", "item": "originality",
     "prompt": "남과 다른 나만의 결은 무엇인가요?",
     "options": ["공감력", "끈기", "시선", "추진력", "창의력", "집중력", "실행력", "균형감", "진정성"]},
    {"id": "p10", "item": "originality",
     "prompt": "한 문장으로 나를 말한다면 어떤 톤인가요?",
     "options": ["선언", "다짐", "초대", "고백", "질문", "약속", "응원", "감사", "위로"],
     "has_input": True, "input_placeholder": "내 단어로 직접 적어주세요"},
]

QUESTIONS = {"brand": BRAND_QUESTIONS, "personal": PERSONAL_QUESTIONS}
ITEMS = {"brand": BRAND_ITEMS, "personal": PERSONAL_ITEMS}


def get_questions(track):
    return QUESTIONS.get(track, BRAND_QUESTIONS)


def get_items(track):
    return ITEMS.get(track, BRAND_ITEMS)


def public_payload():
    return {
        "questions": QUESTIONS,
        "items": {
            t: [{"key": k, "label": l, "color": c} for (k, l, c) in items]
            for t, items in ITEMS.items()
        },
    }
