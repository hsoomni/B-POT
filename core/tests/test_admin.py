import pytest
from django.contrib import admin
from core.models import Result, CTAInquiry

def test_models_registered_in_admin():
    assert admin.site.is_registered(Result)
    assert admin.site.is_registered(CTAInquiry)

@pytest.mark.django_db
def test_admin_changelists_load(client, django_user_model):
    user = django_user_model.objects.create_superuser("admin", "a@a.com", "pass12345")
    client.force_login(user)
    assert client.get("/admin/core/result/").status_code == 200
    assert client.get("/admin/core/ctainquiry/").status_code == 200
