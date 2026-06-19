from django.db import models


class Result(models.Model):
    """A completed diagnostic: track + basic info + answers + generated 6 items."""

    TRACK_CHOICES = [("brand", "브랜드"), ("personal", "개인")]

    track = models.CharField(max_length=20, choices=TRACK_CHOICES)
    basic_info = models.JSONField(default=dict)          # {name, category, target}
    attachment = models.FileField(upload_to="attachments/", null=True, blank=True)
    answers = models.JSONField(default=list)             # [{id, choice, text?}, ...]
    generated = models.JSONField(default=dict)           # {naming:{head,body}, ...}
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        name = (self.basic_info or {}).get("name") or "(이름 없음)"
        return f"[{self.get_track_display()}] {name} · {self.created_at:%Y-%m-%d %H:%M}"


class CTAInquiry(models.Model):
    """A CTA contact request (coffeechat / campaign / workshop)."""

    TYPE_CHOICES = [
        ("coffeechat", "커피챗"),
        ("campaign", "캠페인"),
        ("workshop", "워크숍"),
    ]

    inquiry_type = models.CharField(max_length=20, choices=TYPE_CHOICES, blank=True)
    company = models.CharField(max_length=200, blank=True)   # 회사/이름
    manager = models.CharField(max_length=200, blank=True)   # 담당자
    email = models.EmailField()
    result = models.ForeignKey(
        Result, null=True, blank=True, on_delete=models.SET_NULL, related_name="inquiries"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "CTA 문의"
        verbose_name_plural = "CTA 문의"

    def __str__(self):
        return f"[{self.get_inquiry_type_display() or '문의'}] {self.company or self.email}"
