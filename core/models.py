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
