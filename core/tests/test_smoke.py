import pytest

@pytest.mark.django_db
def test_index_returns_spa_shell(client):
    resp = client.get("/")
    assert resp.status_code == 200
    assert b"data-app-root" in resp.content
