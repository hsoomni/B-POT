from django.urls import path
from core import views

urlpatterns = [
    path("questions/", views.api_questions, name="api_questions"),
    path("submit/", views.api_submit, name="api_submit"),
]
