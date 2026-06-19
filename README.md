# B-POT — 처음 심기는 브랜드 씨앗

10개의 선택형 질문에 답하면, 자라나는 3D 화분을 거쳐 **1page 소개형 결과지(저장용)**를 받는 웹앱.
브랜드 트랙(스몰 브랜드)과 개인 트랙(취준생·퍼스널 브랜딩) 두 갈래.

## 실행

```bash
cd b-pot
pip install -r requirements.txt
cp .env.example .env            # 키 없이도 완전 동작
python manage.py migrate
python manage.py runserver      # http://127.0.0.1:8000
pytest                          # 테스트 10개
```

## 화면 흐름 (스텝 0~14, 새로고침 없는 SPA)

0. 인트로 — 테라코타 화분에 씨앗이 하나씩 떨어져 심김(Three.js), 눈 깜박
1. 트랙 선택 — 브랜드 / 개인
2. 기본 정보 — 브랜드: 브랜드명·카테고리·타깃 / 개인: 이름·좋아하는 컬러·자주 듣는 말
3~12. 질문 10개 — 한 화면=한 질문. 진행 점 + 결과 항목 색 + 6개 선택지 + 선택적 직접입력
13. (전환) 자라나는 3D — 고목나무에 키워드 3D 아이콘 주렁주렁(망원경·전구·로켓·별·레몬 등) → 결과지
13. 결과지 — 좌상단 B-POT/[이름], 6항목, 블랙 통일, PNG 저장
14. CTA 문의 — 커피챗·캠페인·워크숍 → DB + 이메일 + (선택)Google Sheets

## 결과 카피 — 소개 줄글

6항목 = head(짧은 키워드) + body(받침글). **body를 위→아래로 이어 읽으면 소개 글**이 된다(두 트랙 모두).
- 개인: "저는 호기심 많은 김수연입니다. 그래서 … 함께한다면 상큼한 비타민 같은 사람이 되겠습니다."
- 브랜드: "오늘의집은 온기를 담은 이름입니다. 우리는 … 모든 말은 ‘당신을 응원합니다’에서 시작됩니다."
- 개인: 좋아하는 컬러 → 마지막 메타포 + 3D 레몬 색, 자주 듣는 말 → ORIGINALITY 문장.
- 양 트랙 각 60선택지 전수 폴백 없음. 한국어 조사 자동 처리. 빈 입력도 자연스러운 폴백.

## 디자인 시스템

폰트 Pretendard. 배경 스카이블루 `#D6EEF7` + 종이 그레인. 글자/결과지 블랙 `#161616`, 보조 `#1d5d77`.
3D 화분 테라코타 `#C65E33`. 이모지 제외·라인 아이콘만·**그라데이션 없음**. 데스크탑은 430px 모바일 컬럼 중앙 정렬.

## 구조

```
b-pot/
├─ manage.py  requirements.txt  render.yaml  .env.example  pytest.ini  README.md
├─ config/        settings · urls · wsgi
├─ core/  models · views · questions(질문카드 단일출처) · generation(소개 줄글) · emails(이메일+시트웹훅) · admin · tests
├─ templates/index.html
└─ static/  css/app.css  js/(app · intro3d · growth3d · questions · result)
```

## 배포 (Render) — 점검 완료

`render.yaml` 포함. 빌드 `collectstatic`+`migrate`, 시작 `gunicorn config.wsgi`. WhiteNoise 정적.
`manage.py check --deploy` 운영 0 issues. DEBUG=False에서 HTTPS 리다이렉트·HSTS·Secure 쿠키·CSRF 와일드카드(`*.onrender.com`) 자동.
환경변수: `SECRET_KEY`, `DEBUG=False`, `ALLOWED_HOSTS`(예: `.onrender.com`), `EMAIL_TO`(기본 hsoomni@gmail.com).
선택: `GEMINI_API_KEY`(AI 톤), SMTP 일체(실제 메일), `SHEETS_WEBHOOK_URL`(CTA→구글시트).

## 요구사항 대비 의도적 차이 (확정)

- 디자인 팔레트: 설계 D7대로 스카이블루+블랙(요구사항 §8 크라프트 팔레트 대체).
- 파일 첨부: v1 제외(기본정보를 좋아하는 컬러·자주 듣는 말로 대체). 개인정보 안내문은 유지.
- 진행 표시: 헤더 로고 옆 얇은 진행 바(현재 단계 텍스트 비표시 — 사용자 결정).

## 다음 (배포 직전)

최종 컨펌 → Render 배포 → (선택) Gemini·SMTP·구글시트 웹훅·커스텀 도메인 연결.
