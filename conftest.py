import pytest


@pytest.fixture(autouse=True)
def use_locmem_email_backend(settings):
    """Override email backend to locmem so mail.outbox is populated in tests."""
    settings.EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
