import pytest

@pytest.mark.django_db
def test_index_has_spa_shell_hooks(client):
    html = client.get("/").content.decode()
    assert 'data-step-container' in html
    assert 'data-progress-fill' in html
    assert 'data-nav-prev' in html
    assert 'data-nav-next' in html
    assert 'css/app.css' in html
    assert 'js/app.js' in html
    assert 'type="module"' in html
    assert 'three' in html.lower()
    assert 'html2canvas' in html
    assert 'id="seed-a"' in html
