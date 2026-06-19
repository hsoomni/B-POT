from django.urls import path

from . import views

app_name = "core"

urlpatterns = [
    path("", views.index, name="index"),
    path("api/submit", views.api_submit, name="api_submit"),
    path("api/inquiry", views.api_inquiry, name="api_inquiry"),
]
