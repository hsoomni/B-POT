# B-POT 웹앱 설계 문서 (Design Spec)

| 항목 | 값 |
|---|---|
| 서비스명 | B-POT (BRAND SEED가 처음 심기는 POT) |
| 문서 | 구현 설계 스펙 (브레인스토밍 산출물) |
| 작성일 | 2026-06-18 |
| 소유 | 숨니 |
| 원본 요구사항 | `요구사항.md` (v2, 웹앱 스타일) |

이 문서는 `요구사항.md`를 기준으로 하되, 브레인스토밍에서 확정한 결정들을 반영한
**구현용 단일 출처**다. 요구사항과 충돌하는 부분은 "결정" 섹션의 내용을 따른다.

---

## 1. 한 문장 정의

브랜드를 처음 만드는 사람이나 오리지널리티를 찾고 싶은 개인이, 버튼을 눌러가며
10개의 선택형 질문에 답하면 **1page 결과지(씨앗 봉투)**를 받아보는 **웹앱**.

## 2. 브레인스토밍 확정 결정

| # | 항목 | 결정 |
|---|---|---|
| D1 | 질문 카드 내용 | 본 스펙에서 직접 설계 (부록 A). `questions.py`가 단일 출처 |
| D2 | 구축 범위 | 풀스택 전체 (Django 백엔드 + SPA + Three.js + PNG), 로컬 실행 가능 |
| D3 | 3D 인트로 | 가볍고 감각적 — Three.js 저폴리 블랙 화분 + 컬러 일러스트 씨앗 |
| D4 | 화면 전환 | **없음(즉시 전환)**. 슬라이드/페이드 미사용 |
| D5 | 결과지 레이아웃 | A안 — 빈티지 "씨앗 봉투"(세로 봉투형, 블랙 헤더 띠, 6항목 세로 리스트) |
| D6 | 일러스트 스타일 | 일본 GREEN 빈티지풍 — 납작한 단색 씨앗 + 발아 악센트 선 + 종이 그레인 |
| D7 | 컬러 시스템 | **요구사항 v2 팔레트 교체** (아래 8장). 배경 스카이블루(연하게)·컬러 씨앗·블랙 POT |
| D8 | git | 원격 `https://github.com/hsoomni/B-POT` 사용 |

## 3. 기술 스택 / 아키텍처

- **백엔드:** Django 모놀리식, 로그인 없음. SQLite(기본). 역할: `index` 서빙,
  답변 제출 처리·결과 6항목 생성, 문의 저장, 이메일 알림.
- **프론트:** 단일 `index.html` + 바닐라 JS. JS 상태머신이 스텝(0~14)을 전환,
  **새로고침 없음**. 3D는 Three.js, PNG 저장은 html2canvas.
- **결과 생성 위치:** 프론트가 답변(JSON)을 `fetch`로 백엔드에 POST →
  **백엔드가 6항목 생성** → JSON 응답 → 프론트가 씨앗 봉투로 렌더 → html2canvas로 PNG.
  *(이유: AI 키·조립 로직·저장이 모두 서버에 있어야 함. 결과 일관성·재현성 확보)*
- **하이브리드 생성:** `GEMINI_API_KEY` 없으면 선택지 조립(fallback)만으로 완전 동작.
  키가 있으면 조립 결과를 Gemini가 톤 다듬기. 개인정보(CTA 연락처)는 AI 미전송.

### 프로젝트 구조

```
b-pot/
├─ manage.py
├─ requirements.txt
├─ render.yaml
├─ .env.example
├─ config/                # settings, urls, wsgi
│  ├─ settings.py
│  ├─ urls.py
│  └─ wsgi.py
├─ core/                  # 메인 앱
│  ├─ models.py           # Result, CTAInquiry
│  ├─ views.py            # index, api_submit, api_inquiry
│  ├─ urls.py
│  ├─ questions.py        # 10문항 × 2트랙 정의 (단일 출처)
│  ├─ generation.py       # 결과 6항목 생성 (fallback 조립 + Gemini 다듬기)
│  ├─ emails.py           # CTA 이메일 알림
│  ├─ admin.py            # Result / CTAInquiry 어드민
│  └─ tests/              # pytest
├─ templates/
│  └─ index.html          # SPA 셸 (모든 스텝의 컨테이너)
└─ static/
   ├─ css/app.css         # 디자인 시스템
   ├─ img/seeds.svg       # 씨앗 SVG 심볼 defs
   └─ js/
      ├─ app.js           # 스텝 상태머신 (0~14), 즉시 전환, 진행 바
      ├─ intro3d.js       # Three.js 저폴리 화분 + 씨앗
      ├─ questions.js     # 서버 주입 문항 렌더 + 답변 수집
      └─ result.js        # 씨앗 봉투 렌더 + html2canvas PNG 저장
```

## 4. 화면 흐름 (스텝 상태머신)

`app.js`가 단일 컨테이너 안에서 스텝을 교체한다. 전환 애니메이션 없음(즉시).

| 스텝 | 화면 | 전환 |
|---|---|---|
| 0 | 인트로 (Three.js 화분 + 씨앗) | "씨앗 심기" → 1 |
| 1 | 트랙 선택 (브랜드 / 개인) | 카드 선택 → "다음" → 2 |
| 2 | 기본 정보 + 첨부 (개인정보 안내문) | "다음" → 3 |
| 3~12 | 질문 1~10 (한 화면 = 한 질문) | "다음/이전" |
| 13 | 결과지 (6항목, PNG 저장) | "문의하기" → 14 |
| 14 | CTA 문의 폼 | "문의 보내기" → 완료 |

- 상단 고정: 진행 바 + 현재 단계 텍스트. 하단 고정: 다음/이전 버튼.
- 각 스텝은 뷰포트에 꽉 차게. 결과지(13) 스텝만 내용이 길면 스크롤 허용.
- 트랙 선택(1)에 따라 질문 세트와 결과 항목이 분기.
- 클라이언트 상태: `{ track, basicInfo, answers[], result }`를 메모리에 보유.
  제출 전 새로고침 시 데이터 소실(로그인/저장 없음) — 의도된 단순화.

## 5. 질문 & 결과 매핑

- 두 트랙 각 **10문항**, 선택형 중심. **NAMING·CORE VALUE·COMMUNICATION** 카드에는
  선택적 한 줄 입력 1개 제공(요구사항 6).
- 각 문항은 6개 결과 항목 중 하나에 기여. 결과 = **헤드라인 + 받침 2~3줄**.
- 결과 항목:
  - **브랜드:** NAMING / MISSION / CORE VALUE / CONCEPT / PERSONA / COMMUNICATION SLOGAN
  - **개인:** NAMING(수식어) / MISSION / CORE VALUE / CONCEPT / PERSONA(되고 싶은 나) / ORIGINALITY
- 전체 문항·선택지·매핑은 **부록 A**. 최종 단어는 `questions.py`에서 쉽게 수정 가능.

## 6. 결과 생성 로직 (`generation.py`)

1. **조립(fallback):** 각 결과 항목별로, 기여 문항의 선택지에 매핑된 카피 조각을
   규칙 기반으로 조합해 헤드라인 + 받침 생성. 입력이 비어도 항상 유효한 6항목 산출.
2. **AI 다듬기(선택):** `GEMINI_API_KEY` 존재 시, 조립 결과 + 기본정보(이름·카테고리·타깃)를
   프롬프트로 보내 톤·문장만 다듬음. **CTA 연락처 등 개인정보는 전송하지 않음.**
3. **폴백 보장:** Gemini 호출 실패/타임아웃 시 조립 결과를 그대로 반환. 빈 결과 없음.

## 7. 데이터 모델 (`models.py`)

```python
class Result:
    track            # 'brand' | 'personal'
    basic_info       # JSON: {name, category, target, ...}
    attachment       # FileField (선택), media/ 저장
    answers          # JSON: [{qid, choice, text?}, ...]
    generated        # JSON: {naming:{head,body}, mission:{...}, ...} 6항목
    created_at

class CTAInquiry:
    inquiry_type     # 'coffeechat' | 'campaign' | 'workshop'
    company          # 회사/이름
    manager          # 담당자
    email
    result           # FK → Result (nullable)
    created_at
```

## 8. 디자인 시스템 (확정)

- **폰트:** Pretendard.
- **배경:** 스카이블루 연하게 `#D6EEF7` + 미세 종이 그레인(SVG feTurbulence).
- **씨앗(컬러풀):** 토마토 `#E8552D` · 오렌지 `#F2A20C` · 골드 `#F2B90F` ·
  그린 `#5DAA3C` · 틸 `#3FA9A0`. 각 씨앗에 더 짙은 톤의 발아 악센트 선.
- **POT / 글자 강조 / 헤더 띠:** 블랙 `#161616`. 본문 글자 `#161616`, 보조 텍스트 `#1d5d77`.
- **스타일 규칙:** 납작한 단색 면, 손맛 나는 유기적 윤곽, **이모지 제외, 라인 아이콘만,
  그라데이션 없음**.
- **로고:** 텍스트 워드마크 "B-POT".
- **결과지:** A안 빈티지 씨앗 봉투 — 세로 봉투형, 블랙 헤더 띠("B-POT / BRAND SEED PACKET"),
  점선 씨앗 창(window)에 컬러 일러스트 씨앗, 6항목 세로 리스트, 하단 도메인·태그라인.

> 비고: 요구사항 v2 8장 팔레트(POT `#40250D`/SEED `#F2B90F`/PAPER `#D9B88F`,
> 크라프트 배경)는 사용자 결정(D7)에 따라 위 시스템으로 **교체**한다.

## 9. CTA / 이메일 (`emails.py`)

- 문의 폼(스텝 14) 제출 → `CTAInquiry` 저장(항상 성공) → 이메일 알림 발송.
- 수신: `hsoomni@gmail.com`. SMTP는 환경변수. 미설정 시 콘솔 백엔드로 출력(로컬 동작).
- **이메일 발송 실패는 저장과 분리** — 발송 실패해도 문의 저장·사용자 완료 화면은 정상.

## 10. 개인정보 / 보안

- 첨부 안내문 노출: "주민등록번호, 연락처, 주소 등 중요한 개인정보가 포함된 자료는
  첨부하지 말아주세요."
- 비밀값(`GEMINI_API_KEY`, SMTP, `SECRET_KEY`)은 `.env`/환경변수, git 제외(`.gitignore`).
- CTA 연락처는 AI 미전송, DB에만 저장.
- `.env.example`에 필요한 키 목록만 제공.

## 11. 에러 처리

- 제출(`api_submit`) 실패: 프론트는 재시도 버튼 + 안내. 네트워크 오류와 서버 오류 구분 안내.
- 생성 실패: 백엔드가 조립 결과로 폴백, 항상 200 + 6항목 반환.
- 문의(`api_inquiry`) 실패: 저장 실패만 에러. 이메일 실패는 무시하고 성공 처리.
- 첨부: 허용 확장자·용량 제한(서버 검증). 초과 시 명확한 메시지.

## 12. 테스트 전략

- **pytest (백엔드):**
  - `generation.py`: 두 트랙 × (빈 답변 / 일부 답변 / 전체 답변)에서 6항목 항상 생성.
    Gemini 미설정 시 조립 폴백 동작. (AI 호출은 모킹)
  - `models`: Result/CTAInquiry 생성·관계.
  - `views`: `api_submit`(유효/무효 payload), `api_inquiry`(저장 성공, 이메일 실패 격리).
- **프론트(수동 검증):** 스텝 0→14 흐름, 트랙 분기, 이전/다음 경계(첫·마지막), PNG 저장.

## 13. 배포 (Render)

- `render.yaml`: 웹 서비스 1개. 빌드 `pip install -r requirements.txt` + `collectstatic`
  + `migrate`. 시작 `gunicorn config.wsgi`.
- 정적 파일: WhiteNoise. 미디어(첨부): Render 디스크 또는 로컬(무료 등급 한계 명시).
- 환경변수: `SECRET_KEY`, `DEBUG=False`, `ALLOWED_HOSTS`, `GEMINI_API_KEY`(선택),
  SMTP 일체(선택), `EMAIL_TO=hsoomni@gmail.com`.

## 14. 구현 순서(예정 — 구현 계획에서 상세화)

1. Django 스캐폴드 + settings/env + 모델 + 마이그레이션
2. `questions.py`(부록 A) + `generation.py`(조립) + pytest
3. SPA 셸 + 디자인 시스템 CSS + 스텝 상태머신
4. 질문/기본정보/트랙 화면 + 결과 봉투 렌더 + PNG
5. Three.js 인트로
6. CTA 폼 + 이메일 + 어드민
7. Gemini 다듬기(선택) + 폴백
8. Render 배포 설정 + 문서

---

## 부록 A. 질문 세트 (초안 — `questions.py` 단일 출처)

형식: 각 문항 = `{id, item(결과항목), prompt, options[], input?}`.
선택지는 대표 단어(최종은 코드에서 수정 가능). `input:true`는 선택적 한 줄 입력.

### A-1. 브랜드 트랙 (10문항)

| Q | 결과항목 | 질문 | 선택지(예) | 한줄입력 |
|---|---|---|---|---|
| 1 | NAMING | 브랜드가 가장 먼저 떠올리게 하고 싶은 한 단어는? | 따뜻함 / 대담함 / 정직함 / 새로움 | ○ (떠오르는 이름 후보) |
| 2 | NAMING | 이름이 풍겼으면 하는 톤은? | 부드러운 / 강한 / 위트있는 / 클래식한 | |
| 3 | MISSION | 누구의 하루를 바꾸고 싶나요? | 지친 직장인 / 첫 시작인 사람 / 나를 닮은 소수 / 모두 | |
| 4 | MISSION | 어떤 변화를 남기고 싶나요? | 위로 / 자신감 / 영감 / 편리함 | |
| 5 | CORE VALUE | 타협할 수 없는 단 하나의 기준은? | 품질 / 솔직함 / 지속가능성 / 즐거움 | ○ (나만의 원칙) |
| 6 | CONCEPT | "우리 브랜드는 ___ 같다" | 든든한 베이스캠프 / 첫 햇살 / 오래된 단골집 / 실험실 | |
| 7 | CONCEPT | 카테고리 안에서 위치는? | 입문·친근 / 프리미엄 / 실용·합리 / 실험·전위 | |
| 8 | PERSONA | 브랜드가 사람이라면 말투는? | 다정한 친구 / 단단한 전문가 / 장난기 동료 / 조용한 안내자 | |
| 9 | PERSONA | 첫인상 무드는? | 포근함 / 세련됨 / 활기참 / 묵직함 | |
| 10 | COMMUNICATION | 한 문장으로 건네고 싶은 말의 톤은? | 응원 / 선언 / 초대 / 약속 | ○ (하고 싶은 말) |

### A-2. 개인 트랙 (10문항)

| Q | 결과항목 | 질문 | 선택지(예) | 한줄입력 |
|---|---|---|---|---|
| 1 | NAMING(수식어) | 나를 한 단어로 수식한다면? | 다정한 / 단단한 / 호기심 많은 / 꾸준한 | ○ (떠오르는 수식어) |
| 2 | NAMING(수식어) | 그 수식어의 톤은? | 부드러운 / 강한 / 위트있는 / 담백한 | |
| 3 | MISSION | 내가 돕고 싶은 사람은? | 막막한 후배 / 같은 길의 동료 / 나를 닮은 사람 / 더 넓은 세상 | |
| 4 | MISSION | 남기고 싶은 변화는? | 용기 / 영감 / 실질적 도움 / 즐거움 | |
| 5 | CORE VALUE | 타협 못 하는 나의 기준은? | 정직 / 성실 / 자유 / 성장 | ○ (나만의 원칙) |
| 6 | CONCEPT | "나는 ___ 같은 사람" | 길잡이 / 첫 햇살 / 든든한 동료 / 끊임없는 실험가 | |
| 7 | PERSONA(되고싶은나) | 1년 뒤 되고 싶은 모습은? | 신뢰받는 전문가 / 자유로운 창작자 / 따뜻한 리더 / 묵묵한 실력자 | |
| 8 | PERSONA(되고싶은나) | 사람들이 기억했으면 하는 무드는? | 포근함 / 세련됨 / 활기참 / 묵직함 | |
| 9 | ORIGINALITY | 남과 다른 나만의 결은? | 공감력 / 끈기 / 시선 / 추진력 | |
| 10 | ORIGINALITY | 한 문장으로 나를 말한다면 톤은? | 선언 / 다짐 / 초대 / 고백 | ○ (하고 싶은 말) |

> **문항 → 결과항목 매핑**
> - 브랜드: Q1·2→NAMING, Q3·4→MISSION, Q5→CORE VALUE, Q6·7→CONCEPT, Q8·9→PERSONA, Q10→COMMUNICATION
> - 개인: Q1·2→NAMING(수식어), Q3·4→MISSION, Q5→CORE VALUE, Q6→CONCEPT, Q7·8→PERSONA(되고 싶은 나), Q9·10→ORIGINALITY
>
> `generation.py`가 항목별 기여 문항을 모아 헤드라인 + 받침을 조립한다. 선택지별 카피 조각 사전은 구현 시 `generation.py`에 작성.
