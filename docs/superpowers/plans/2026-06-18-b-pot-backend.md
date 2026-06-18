# B-POT Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the B-POT Django monolithic backend: serves the SPA shell, accepts answer submissions, generates the 6-item result (rule-based assembly + optional Gemini polish), and stores CTA inquiries with email notification.

**Architecture:** Single Django project (`config`) with one app (`core`). Stateless result generation in `generation.py` driven by question definitions in `questions.py`. JSON API endpoints consumed by the vanilla-JS frontend (built in Plan 2). SQLite by default; secrets via environment.

**Tech Stack:** Python 3.11+, Django 5, pytest + pytest-django, python-dotenv, google-generativeai (optional, lazy), WhiteNoise, gunicorn.

Reference spec: `docs/superpowers/specs/2026-06-18-b-pot-webapp-design.md`

---

## File Structure

- `requirements.txt` — pinned dependencies
- `.env.example` — documented env keys (no secrets)
- `pytest.ini` — pytest-django config
- `manage.py` — Django entry
- `config/settings.py` — settings, env loading
- `config/urls.py` — root URL conf (index + `core` API)
- `config/wsgi.py` — WSGI entry
- `core/__init__.py`
- `core/apps.py`
- `core/models.py` — `Result`, `CTAInquiry`
- `core/questions.py` — question sets + result-item maps (single source of truth)
- `core/generation.py` — `generate()` (assembly fallback + Gemini polish)
- `core/emails.py` — `send_inquiry_notification()`
- `core/views.py` — `index`, `api_questions`, `api_submit`, `api_inquiry`
- `core/urls.py` — API routes
- `core/admin.py` — admin registration
- `core/migrations/` — generated
- `core/tests/` — pytest test modules
- `templates/index.html` — minimal SPA shell placeholder (fleshed out in Plan 2)
- `static/.gitkeep` — static dir placeholder

---

## Task 1: Project scaffold + settings + env

**Files:**
- Create: `requirements.txt`, `.env.example`, `pytest.ini`, `manage.py`
- Create: `config/__init__.py`, `config/settings.py`, `config/urls.py`, `config/wsgi.py`
- Create: `core/__init__.py`, `core/apps.py`
- Create: `templates/index.html`, `static/.gitkeep`
- Test: `core/tests/__init__.py`, `core/tests/test_smoke.py`

- [ ] **Step 1: Create `requirements.txt`**

```text
Django==5.0.6
python-dotenv==1.0.1
gunicorn==22.0.0
whitenoise==6.7.0
pytest==8.2.2
pytest-django==4.8.0
```
(`google-generativeai` is intentionally omitted here; it is imported lazily in Task 5 and only needed when a key is set. It will be added in Task 5.)

- [ ] **Step 2: Create `.env.example`**

```text
# Django
SECRET_KEY=dev-insecure-change-me
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Result generation (optional). If unset, rule-based assembly is used.
GEMINI_API_KEY=

# Email (optional). If unset, console backend is used.
EMAIL_HOST=
EMAIL_PORT=587
EMAIL_HOST_USER=
EMAIL_HOST_PASSWORD=
EMAIL_USE_TLS=True
EMAIL_TO=hsoomni@gmail.com
```

- [ ] **Step 3: Create `manage.py`**

```python
#!/usr/bin/env python
import os
import sys

def main():
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
    from django.core.management import execute_from_command_line
    execute_from_command_line(sys.argv)

if __name__ == "__main__":
    main()
```

- [ ] **Step 4: Create `config/__init__.py` (empty) and `config/settings.py`**

```python
import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

SECRET_KEY = os.environ.get("SECRET_KEY", "dev-insecure-change-me")
DEBUG = os.environ.get("DEBUG", "True") == "True"
ALLOWED_HOSTS = os.environ.get("ALLOWED_HOSTS", "localhost,127.0.0.1").split(",")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "core",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [{
    "BACKEND": "django.template.backends.django.DjangoTemplates",
    "DIRS": [BASE_DIR / "templates"],
    "APP_DIRS": True,
    "OPTIONS": {"context_processors": [
        "django.template.context_processors.request",
        "django.contrib.auth.context_processors.auth",
        "django.contrib.messages.context_processors.messages",
    ]},
}]

WSGI_APPLICATION = "config.wsgi.application"

DATABASES = {
    "default": {"ENGINE": "django.db.backends.sqlite3", "NAME": BASE_DIR / "db.sqlite3"}
}

STATIC_URL = "/static/"
STATICFILES_DIRS = [BASE_DIR / "static"]
STATIC_ROOT = BASE_DIR / "staticfiles"
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedStaticFilesStorage"},
}
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
LANGUAGE_CODE = "ko-kr"
TIME_ZONE = "Asia/Seoul"
USE_I18N = True
USE_TZ = True

# App config
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "").strip()
EMAIL_TO = os.environ.get("EMAIL_TO", "hsoomni@gmail.com")

if os.environ.get("EMAIL_HOST"):
    EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
    EMAIL_HOST = os.environ["EMAIL_HOST"]
    EMAIL_PORT = int(os.environ.get("EMAIL_PORT", "587"))
    EMAIL_HOST_USER = os.environ.get("EMAIL_HOST_USER", "")
    EMAIL_HOST_PASSWORD = os.environ.get("EMAIL_HOST_PASSWORD", "")
    EMAIL_USE_TLS = os.environ.get("EMAIL_USE_TLS", "True") == "True"
    DEFAULT_FROM_EMAIL = EMAIL_HOST_USER or "no-reply@b-pot.kr"
else:
    EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
    DEFAULT_FROM_EMAIL = "no-reply@b-pot.kr"

# File upload guardrails (attachments)
MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB
ALLOWED_UPLOAD_EXTS = {".pdf", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".txt", ".md", ".pptx", ".key"}
```

- [ ] **Step 5: Create `config/wsgi.py` and `config/urls.py`**

`config/wsgi.py`:
```python
import os
from django.core.wsgi import get_wsgi_application
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
application = get_wsgi_application()
```

`config/urls.py`:
```python
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from core.views import index

urlpatterns = [
    path("", index, name="index"),
    path("admin/", admin.site.urls),
    path("api/", include("core.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
```

- [ ] **Step 6: Create `core/__init__.py` (empty), `core/apps.py`, and minimal `core/views.py` + `core/urls.py` so the project boots**

`core/apps.py`:
```python
from django.apps import AppConfig

class CoreConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "core"
```

`core/views.py` (temporary minimal; expanded in Tasks 6–8):
```python
from django.shortcuts import render

def index(request):
    return render(request, "index.html")
```

`core/urls.py` (temporary minimal; expanded in Tasks 6–7):
```python
from django.urls import path

urlpatterns = []
```

- [ ] **Step 7: Create `templates/index.html` (placeholder shell, fleshed out in Plan 2) and `static/.gitkeep`**

`templates/index.html`:
```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
  <title>B-POT</title>
</head>
<body>
  <div id="app" data-app-root>B-POT</div>
</body>
</html>
```

`static/.gitkeep`: empty file.

- [ ] **Step 8: Create `pytest.ini`**

```ini
[pytest]
DJANGO_SETTINGS_MODULE = config.settings
python_files = test_*.py
```

- [ ] **Step 9: Write the smoke test**

`core/tests/__init__.py`: empty file.

`core/tests/test_smoke.py`:
```python
import pytest

@pytest.mark.django_db
def test_index_returns_spa_shell(client):
    resp = client.get("/")
    assert resp.status_code == 200
    assert b"data-app-root" in resp.content
```

- [ ] **Step 10: Run the smoke test to verify it passes**

Run: `python -m pytest core/tests/test_smoke.py -v`
Expected: 1 passed. (If `django.core.management` errors appear, run `python manage.py check` first to surface settings issues.)

- [ ] **Step 11: Commit**

```bash
git add requirements.txt .env.example pytest.ini manage.py config core templates static
git commit -m "feat(backend): scaffold Django project, settings, and smoke test"
```

---

## Task 2: Data models (Result, CTAInquiry)

**Files:**
- Create: `core/models.py`
- Create (generated): `core/migrations/0001_initial.py`
- Test: `core/tests/test_models.py`

- [ ] **Step 1: Write the failing test**

`core/tests/test_models.py`:
```python
import pytest
from core.models import Result, CTAInquiry

@pytest.mark.django_db
def test_result_defaults_and_persistence():
    r = Result.objects.create(
        track="brand",
        basic_info={"name": "씨앗가게", "category": "리테일", "target": "20대"},
        answers=[{"qid": "b1", "choice": "따뜻함", "text": "씨앗"}],
        generated={"naming": {"head": "씨앗과 햇살", "body": "따뜻함."}},
    )
    assert r.pk is not None
    assert r.created_at is not None
    assert r.basic_info["name"] == "씨앗가게"
    assert r.answers[0]["choice"] == "따뜻함"

@pytest.mark.django_db
def test_cta_inquiry_links_to_result():
    r = Result.objects.create(track="personal")
    q = CTAInquiry.objects.create(
        inquiry_type="coffeechat", company="숨니", manager="숨니",
        email="hsoomni@gmail.com", result=r,
    )
    assert q.result == r
    assert r.inquiries.count() == 1

@pytest.mark.django_db
def test_result_json_fields_default_empty():
    r = Result.objects.create(track="brand")
    assert r.basic_info == {}
    assert r.answers == []
    assert r.generated == {}
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `python -m pytest core/tests/test_models.py -v`
Expected: FAIL with `ImportError: cannot import name 'Result'` (or `CTAInquiry`).

- [ ] **Step 3: Write `core/models.py`**

```python
from django.db import models

class Result(models.Model):
    TRACK_CHOICES = [("brand", "브랜드"), ("personal", "개인")]
    track = models.CharField(max_length=16, choices=TRACK_CHOICES)
    basic_info = models.JSONField(default=dict, blank=True)
    attachment = models.FileField(upload_to="attachments/", null=True, blank=True)
    answers = models.JSONField(default=list, blank=True)
    generated = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Result #{self.pk} ({self.track})"

class CTAInquiry(models.Model):
    TYPE_CHOICES = [
        ("coffeechat", "커피챗"),
        ("campaign", "캠페인"),
        ("workshop", "워크샵"),
    ]
    inquiry_type = models.CharField(max_length=16, choices=TYPE_CHOICES)
    company = models.CharField(max_length=120)
    manager = models.CharField(max_length=80)
    email = models.EmailField()
    result = models.ForeignKey(
        Result, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="inquiries",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.get_inquiry_type_display()} · {self.company}"
```

- [ ] **Step 4: Generate and apply migrations**

Run: `python manage.py makemigrations core && python manage.py migrate`
Expected: Creates `core/migrations/0001_initial.py`, applies all migrations without error.

- [ ] **Step 5: Run the test to verify it passes**

Run: `python -m pytest core/tests/test_models.py -v`
Expected: 3 passed.

- [ ] **Step 6: Commit**

```bash
git add core/models.py core/migrations
git commit -m "feat(backend): add Result and CTAInquiry models"
```

---

## Task 3: Question sets (`questions.py`)

**Files:**
- Create: `core/questions.py`
- Test: `core/tests/test_questions.py`

- [ ] **Step 1: Write the failing test**

`core/tests/test_questions.py`:
```python
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

def test_optional_input_only_on_three_cards():
    # NAMING, CORE VALUE, COMMUNICATION/ORIGINALITY families per spec
    for track in ("brand", "personal"):
        input_items = {q["item"] for q in Q.get_questions(track) if q.get("input")}
        assert "naming" in input_items
        assert "core_value" in input_items
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `python -m pytest core/tests/test_questions.py -v`
Expected: FAIL with `ModuleNotFoundError` / `AttributeError: get_questions`.

- [ ] **Step 3: Write `core/questions.py`**

```python
"""Single source of truth for B-POT question sets and result-item maps.

Each question: {id, item, prompt, options[list[str]], input(bool optional)}.
`item` is the result section the question contributes to.
Option wording is final-tunable here without touching generation logic shape.
"""

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

def get_questions(track):
    """Return the list of questions for a track. Raises KeyError on unknown track."""
    return QUESTIONS[track]
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `python -m pytest core/tests/test_questions.py -v`
Expected: 6 passed.

- [ ] **Step 5: Commit**

```bash
git add core/questions.py core/tests/test_questions.py
git commit -m "feat(backend): add question sets and result-item maps"
```

---

## Task 4: Result generation — rule-based assembly (`generation.py`)

**Files:**
- Create: `core/generation.py`
- Test: `core/tests/test_generation.py`

The assembler builds each result item from the answers whose question `item` matches.
It is fully data-driven: an `OPTION_FRAGMENTS` dict maps `(item, option)` to a copy
fragment; a per-item `HEADERS` dict supplies the headline template. Any option without a
custom fragment falls back to a sensible default, so output is **never empty**.

- [ ] **Step 1: Write the failing test**

`core/tests/test_generation.py`:
```python
import pytest
from core.generation import generate, assemble
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

def test_assemble_with_partial_answers(track="brand"):
    answers = [{"qid": "b1", "choice": "따뜻함", "text": "씨앗"}]
    result = assemble(track, answers)
    assert set(result.keys()) == set(Q.RESULT_ITEMS[track])
    assert "씨앗" in result["naming"]["head"] or "씨앗" in result["naming"]["body"]

def test_generate_without_key_uses_assembly(settings):
    settings.GEMINI_API_KEY = ""
    result = generate("brand", _answers_all("brand"))
    assert set(result.keys()) == set(Q.RESULT_ITEMS["brand"])
    for block in result.values():
        assert block["head"] and block["body"]

def test_unknown_choice_falls_back_to_default():
    # An option string not present in OPTION_FRAGMENTS must not crash.
    answers = [{"qid": "b1", "choice": "존재하지않는선택지"}]
    result = assemble("brand", answers)
    assert result["naming"]["head"].strip()
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `python -m pytest core/tests/test_generation.py -v`
Expected: FAIL with `ModuleNotFoundError: core.generation`.

- [ ] **Step 3: Write `core/generation.py` (assembly only; Gemini added in Task 5)**

```python
"""B-POT result generation.

`generate()` is the public entry point. It always returns a dict of 6 result items
shaped as {item: {"label": str, "head": str, "body": str}}. Rule-based assembly is the
guaranteed fallback; Gemini polish (Task 5) is layered on top when a key is configured.
"""
from django.conf import settings
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
    choices = [a.get("choice") for a in group if a.get("choice")]
    texts = [a.get("text") for a in group if a.get("text")]
    kw = (texts[0] if texts else (choices[0] if choices else "당신")).strip() or "당신"
    return HEADERS.get(item, "{kw}").format(kw=kw)

def _body_for(item, group):
    parts = []
    for a in group:
        frag = OPTION_FRAGMENTS.get((item, a.get("choice")))
        if frag:
            parts.append(frag)
    if not parts:
        parts.append(DEFAULT_BODY)
    # 2~3 supporting lines max.
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
    """Public entry. Assembly fallback now; Gemini polish layered in Task 5."""
    return assemble(track, answers, basic_info)
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `python -m pytest core/tests/test_generation.py -v`
Expected: 8 passed (parametrized cases counted individually).

- [ ] **Step 5: Commit**

```bash
git add core/generation.py core/tests/test_generation.py
git commit -m "feat(backend): rule-based 6-item result assembly"
```

---

## Task 5: Optional Gemini polish with guaranteed fallback

**Files:**
- Modify: `core/generation.py` (replace `generate()`, add `_polish()` + lazy import)
- Modify: `requirements.txt` (add `google-generativeai`)
- Test: `core/tests/test_gemini.py`

- [ ] **Step 1: Write the failing test**

`core/tests/test_gemini.py`:
```python
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
    assert result["naming"]["head"] == "P"

def test_polish_failure_falls_back_to_assembly(settings):
    settings.GEMINI_API_KEY = "fake-key"
    with patch.object(generation, "_polish", side_effect=RuntimeError("boom")):
        result = generation.generate("brand", _answers("brand"))
    # Assembly output still complete.
    assert set(result.keys()) == set(Q.RESULT_ITEMS["brand"])
    for block in result.values():
        assert block["head"] and block["body"]

def test_no_key_skips_polish(settings):
    settings.GEMINI_API_KEY = ""
    with patch.object(generation, "_polish") as mp:
        generation.generate("brand", _answers("brand"))
    mp.assert_not_called()
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `python -m pytest core/tests/test_gemini.py -v`
Expected: FAIL with `AttributeError: module 'core.generation' has no attribute '_polish'`.

- [ ] **Step 3: Add `google-generativeai` to `requirements.txt`**

Append this line to `requirements.txt`:
```text
google-generativeai==0.7.2
```
Run: `pip install -r requirements.txt`

- [ ] **Step 4: Replace `generate()` in `core/generation.py` and add `_polish()`**

Replace the existing `generate()` function (last function in the file) with:
```python
def _polish(track, assembled, basic_info):
    """Refine assembled copy tone via Gemini. Never sends CTA contact info.

    Raises on any error; caller (generate) handles fallback.
    """
    import json
    import google.generativeai as genai

    genai.configure(api_key=settings.GEMINI_API_KEY)
    model = genai.GenerativeModel("gemini-1.5-flash")

    safe_info = {k: basic_info.get(k) for k in ("name", "category", "target")} if basic_info else {}
    prompt = (
        "너는 한국어 브랜드 카피라이터다. 아래 JSON의 각 항목 head/body의 '톤과 문장'만 "
        "자연스럽게 다듬어라. 의미·구조·키는 바꾸지 말고, 같은 키 구조의 JSON만 출력하라.\n"
        f"기본정보: {json.dumps(safe_info, ensure_ascii=False)}\n"
        f"항목: {json.dumps(assembled, ensure_ascii=False)}"
    )
    resp = model.generate_content(prompt)
    text = resp.text.strip()
    if text.startswith("```"):
        text = text.strip("`")
        text = text[text.find("{"):text.rfind("}") + 1]
    polished = json.loads(text)

    # Validate shape; if anything missing, fall back to assembled for that item.
    out = {}
    for item in Q.RESULT_ITEMS[track]:
        block = polished.get(item) or {}
        out[item] = {
            "label": Q.ITEM_LABELS[item],
            "head": (block.get("head") or assembled[item]["head"]).strip(),
            "body": (block.get("body") or assembled[item]["body"]).strip(),
        }
    return out

def generate(track, answers, basic_info=None):
    """Public entry. Assembly fallback, optional Gemini polish on top."""
    assembled = assemble(track, answers, basic_info)
    if settings.GEMINI_API_KEY:
        try:
            return _polish(track, assembled, basic_info or {})
        except Exception:
            return assembled
    return assembled
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `python -m pytest core/tests/test_gemini.py -v`
Expected: 3 passed.

- [ ] **Step 6: Run the full suite to confirm no regressions**

Run: `python -m pytest -v`
Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add core/generation.py core/tests/test_gemini.py requirements.txt
git commit -m "feat(backend): optional Gemini polish with assembly fallback"
```

---

## Task 6: API — questions + submit (`api_questions`, `api_submit`)

**Files:**
- Modify: `core/views.py` (add `api_questions`, `api_submit`; keep `index`)
- Modify: `core/urls.py` (add routes)
- Test: `core/tests/test_api_submit.py`

- [ ] **Step 1: Write the failing test**

`core/tests/test_api_submit.py`:
```python
import json
import pytest
from core.models import Result
from core import questions as Q

@pytest.mark.django_db
def test_api_questions_returns_both_tracks(client):
    resp = client.get("/api/questions/")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["brand"]) == 10
    assert len(data["personal"]) == 10
    assert data["result_items"]["brand"][0] == "naming"

@pytest.mark.django_db
def test_api_submit_creates_result_and_returns_six_items(client):
    answers = [{"qid": q["id"], "choice": q["options"][0]} for q in Q.get_questions("brand")]
    payload = {"track": "brand", "basic_info": {"name": "씨앗가게"}, "answers": answers}
    resp = client.post("/api/submit/", data=json.dumps(payload), content_type="application/json")
    assert resp.status_code == 200
    data = resp.json()
    assert set(data["generated"].keys()) == set(Q.RESULT_ITEMS["brand"])
    assert data["result_id"]
    assert Result.objects.filter(pk=data["result_id"]).exists()

@pytest.mark.django_db
def test_api_submit_rejects_unknown_track(client):
    resp = client.post("/api/submit/", data=json.dumps({"track": "nope", "answers": []}),
                       content_type="application/json")
    assert resp.status_code == 400

@pytest.mark.django_db
def test_api_submit_rejects_non_post(client):
    assert client.get("/api/submit/").status_code == 405

@pytest.mark.django_db
def test_api_submit_accepts_attachment(client, settings, tmp_path):
    from django.core.files.uploadedfile import SimpleUploadedFile
    settings.MEDIA_ROOT = tmp_path
    answers = [{"qid": q["id"], "choice": q["options"][0]} for q in Q.get_questions("brand")]
    f = SimpleUploadedFile("brief.txt", b"hello", content_type="text/plain")
    resp = client.post("/api/submit/", data={
        "payload": json.dumps({"track": "brand", "answers": answers}),
        "attachment": f,
    })  # multipart/form-data (no content_type kwarg => Django test client uses multipart)
    assert resp.status_code == 200
    rid = resp.json()["result_id"]
    assert Result.objects.get(pk=rid).attachment

@pytest.mark.django_db
def test_api_submit_rejects_bad_extension(client, settings, tmp_path):
    from django.core.files.uploadedfile import SimpleUploadedFile
    settings.MEDIA_ROOT = tmp_path
    f = SimpleUploadedFile("evil.exe", b"x", content_type="application/octet-stream")
    resp = client.post("/api/submit/", data={
        "payload": json.dumps({"track": "brand", "answers": []}),
        "attachment": f,
    })
    assert resp.status_code == 400
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `python -m pytest core/tests/test_api_submit.py -v`
Expected: FAIL with 404 (routes not defined yet).

- [ ] **Step 3: Replace `core/views.py`**

```python
import json
import os
from django.conf import settings
from django.http import JsonResponse
from django.shortcuts import render
from django.views.decorators.http import require_http_methods, require_POST
from django.views.decorators.csrf import csrf_exempt

from core import questions as Q
from core.generation import generate
from core.models import Result, CTAInquiry
from core.emails import send_inquiry_notification

def index(request):
    return render(request, "index.html")

@require_http_methods(["GET"])
def api_questions(request):
    return JsonResponse({
        "brand": Q.get_questions("brand"),
        "personal": Q.get_questions("personal"),
        "result_items": Q.RESULT_ITEMS,
        "item_labels": Q.ITEM_LABELS,
    })

def _parse_submit(request):
    """Return (payload_dict, attachment_or_None). Supports JSON or multipart."""
    if request.content_type and request.content_type.startswith("multipart/"):
        payload = json.loads(request.POST.get("payload", "{}"))
        return payload, request.FILES.get("attachment")
    return json.loads(request.body or "{}"), None

def _validate_attachment(f):
    """Return an error code string if invalid, else None."""
    ext = os.path.splitext(f.name)[1].lower()
    if ext not in settings.ALLOWED_UPLOAD_EXTS:
        return "bad_ext"
    if f.size > settings.MAX_UPLOAD_BYTES:
        return "too_large"
    return None

@csrf_exempt
@require_POST
def api_submit(request):
    try:
        payload, attachment = _parse_submit(request)
    except json.JSONDecodeError:
        return JsonResponse({"error": "invalid_json"}, status=400)

    track = payload.get("track")
    if track not in Q.RESULT_ITEMS:
        return JsonResponse({"error": "unknown_track"}, status=400)

    if attachment is not None:
        err = _validate_attachment(attachment)
        if err:
            return JsonResponse({"error": err}, status=400)

    answers = payload.get("answers") or []
    basic_info = payload.get("basic_info") or {}
    generated = generate(track, answers, basic_info)

    result = Result.objects.create(
        track=track, basic_info=basic_info, answers=answers,
        generated=generated, attachment=attachment,
    )
    return JsonResponse({"result_id": result.pk, "generated": generated})
```

Note: `api_submit` is `@csrf_exempt` because the SPA posts via `fetch` without a
session/login (no auth, no cookie-based state). Inputs are validated explicitly. It
accepts either `application/json` (no file) or `multipart/form-data` (a `payload` JSON
string field + optional `attachment` file), so the basic-info step can include a file.

- [ ] **Step 4: Replace `core/urls.py`**

```python
from django.urls import path
from core import views

urlpatterns = [
    path("questions/", views.api_questions, name="api_questions"),
    path("submit/", views.api_submit, name="api_submit"),
]
```

- [ ] **Step 5: Add `core/emails.py` stub so the import in views resolves (full impl in Task 7)**

`core/emails.py`:
```python
def send_inquiry_notification(inquiry):
    """Send CTA inquiry notification email. Implemented in Task 7."""
    return False
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `python -m pytest core/tests/test_api_submit.py -v`
Expected: 4 passed.

- [ ] **Step 7: Commit**

```bash
git add core/views.py core/urls.py core/emails.py core/tests/test_api_submit.py
git commit -m "feat(backend): questions + submit API endpoints"
```

---

## Task 7: API — inquiry + email notification (`api_inquiry`, `emails.py`)

**Files:**
- Modify: `core/emails.py` (real implementation)
- Modify: `core/views.py` (add `api_inquiry`)
- Modify: `core/urls.py` (add route)
- Test: `core/tests/test_api_inquiry.py`

- [ ] **Step 1: Write the failing test**

`core/tests/test_api_inquiry.py`:
```python
import json
import pytest
from unittest.mock import patch
from django.core import mail
from core.models import Result, CTAInquiry

@pytest.mark.django_db
def test_api_inquiry_saves_and_emails(client):
    r = Result.objects.create(track="brand")
    payload = {"inquiry_type": "coffeechat", "company": "숨니", "manager": "숨니",
               "email": "hsoomni@gmail.com", "result_id": r.pk}
    resp = client.post("/api/inquiry/", data=json.dumps(payload), content_type="application/json")
    assert resp.status_code == 200
    assert CTAInquiry.objects.filter(company="숨니", result=r).exists()
    assert len(mail.outbox) == 1
    assert "hsoomni@gmail.com" in mail.outbox[0].to

@pytest.mark.django_db
def test_api_inquiry_email_failure_is_isolated(client):
    payload = {"inquiry_type": "workshop", "company": "X", "manager": "Y",
               "email": "y@example.com"}
    with patch("core.views.send_inquiry_notification", side_effect=RuntimeError("smtp down")):
        resp = client.post("/api/inquiry/", data=json.dumps(payload), content_type="application/json")
    assert resp.status_code == 200
    assert CTAInquiry.objects.filter(company="X").exists()

@pytest.mark.django_db
def test_api_inquiry_requires_fields(client):
    resp = client.post("/api/inquiry/", data=json.dumps({"company": "X"}),
                       content_type="application/json")
    assert resp.status_code == 400
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `python -m pytest core/tests/test_api_inquiry.py -v`
Expected: FAIL with 404 (route missing).

- [ ] **Step 3: Implement `core/emails.py`**

```python
from django.conf import settings
from django.core.mail import send_mail

def send_inquiry_notification(inquiry):
    """Email the team about a new CTA inquiry. Returns True on send.

    Raises on transport error; callers isolate failures from inquiry persistence.
    """
    subject = f"[B-POT] 새 문의 · {inquiry.get_inquiry_type_display()} · {inquiry.company}"
    lines = [
        f"유형: {inquiry.get_inquiry_type_display()}",
        f"회사/이름: {inquiry.company}",
        f"담당자: {inquiry.manager}",
        f"이메일: {inquiry.email}",
        f"연결 결과: #{inquiry.result_id}" if inquiry.result_id else "연결 결과: 없음",
        f"생성: {inquiry.created_at:%Y-%m-%d %H:%M}",
    ]
    send_mail(
        subject=subject,
        message="\n".join(lines),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[settings.EMAIL_TO],
        fail_silently=False,
    )
    return True
```

- [ ] **Step 4: Add `api_inquiry` to `core/views.py`**

Append this function to `core/views.py`:
```python
@csrf_exempt
@require_POST
def api_inquiry(request):
    try:
        payload = json.loads(request.body or "{}")
    except json.JSONDecodeError:
        return JsonResponse({"error": "invalid_json"}, status=400)

    required = ("inquiry_type", "company", "manager", "email")
    if not all(payload.get(k) for k in required):
        return JsonResponse({"error": "missing_fields"}, status=400)

    valid_types = {c[0] for c in CTAInquiry.TYPE_CHOICES}
    if payload["inquiry_type"] not in valid_types:
        return JsonResponse({"error": "unknown_type"}, status=400)

    result = None
    if payload.get("result_id"):
        result = Result.objects.filter(pk=payload["result_id"]).first()

    inquiry = CTAInquiry.objects.create(
        inquiry_type=payload["inquiry_type"],
        company=payload["company"],
        manager=payload["manager"],
        email=payload["email"],
        result=result,
    )

    # Email failure must not break inquiry persistence.
    try:
        send_inquiry_notification(inquiry)
    except Exception:
        pass

    return JsonResponse({"ok": True, "inquiry_id": inquiry.pk})
```

- [ ] **Step 5: Add the route to `core/urls.py`**

```python
from django.urls import path
from core import views

urlpatterns = [
    path("questions/", views.api_questions, name="api_questions"),
    path("submit/", views.api_submit, name="api_submit"),
    path("inquiry/", views.api_inquiry, name="api_inquiry"),
]
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `python -m pytest core/tests/test_api_inquiry.py -v`
Expected: 3 passed.

- [ ] **Step 7: Commit**

```bash
git add core/emails.py core/views.py core/urls.py core/tests/test_api_inquiry.py
git commit -m "feat(backend): inquiry API with isolated email notification"
```

---

## Task 8: Admin registration + full-suite gate

**Files:**
- Create: `core/admin.py`
- Test: `core/tests/test_admin.py`

- [ ] **Step 1: Write the failing test**

`core/tests/test_admin.py`:
```python
import pytest
from django.contrib import admin
from core.models import Result, CTAInquiry

def test_models_registered_in_admin():
    assert admin.site.is_registered(Result)
    assert admin.site.is_registered(CTAInquiry)

@pytest.mark.django_db
def test_admin_result_changelist_loads(client, django_user_model):
    django_user_model.objects.create_superuser("admin", "a@a.com", "pass12345")
    client.login(username="admin", password="pass12345")
    assert client.get("/admin/core/result/").status_code == 200
    assert client.get("/admin/core/ctainquiry/").status_code == 200
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `python -m pytest core/tests/test_admin.py -v`
Expected: FAIL — models not registered.

- [ ] **Step 3: Write `core/admin.py`**

```python
from django.contrib import admin
from core.models import Result, CTAInquiry

@admin.register(Result)
class ResultAdmin(admin.ModelAdmin):
    list_display = ("id", "track", "created_at")
    list_filter = ("track", "created_at")
    readonly_fields = ("created_at",)

@admin.register(CTAInquiry)
class CTAInquiryAdmin(admin.ModelAdmin):
    list_display = ("id", "inquiry_type", "company", "manager", "email", "created_at")
    list_filter = ("inquiry_type", "created_at")
    search_fields = ("company", "manager", "email")
    readonly_fields = ("created_at",)
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `python -m pytest core/tests/test_admin.py -v`
Expected: 2 passed.

- [ ] **Step 5: Run the full suite + Django checks (final gate)**

Run: `python -m pytest -v && python manage.py check`
Expected: all tests pass; `System check identified no issues`.

- [ ] **Step 6: Commit**

```bash
git add core/admin.py core/tests/test_admin.py
git commit -m "feat(backend): register admin and pass full suite"
```

---

## Done criteria (Plan 1)

- `python -m pytest -v` → all green.
- `python manage.py runserver` → `/` serves the SPA shell; `/api/questions/` returns
  both tracks; `/admin/` lists Result and CTAInquiry.
- Result generation returns a full 6-item payload with or without `GEMINI_API_KEY`.
- CTA inquiry persists and triggers an email (console backend locally), with email
  failures isolated from persistence.

**Next:** Plan 2 (frontend SPA) consumes `/api/questions/`, `/api/submit/`, `/api/inquiry/`.
