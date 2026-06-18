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
