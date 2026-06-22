from unittest.mock import patch

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_kakao_login_redirect():
    response = client.get("/api/v1/auth/kakao/login", follow_redirects=False)
    assert response.status_code in [302, 307]
    assert "https://kauth.kakao.com/oauth/authorize" in response.headers["location"]

@patch("redis.Redis")
def test_naver_login_redirect(mock_redis):
    response = client.get("/api/v1/auth/naver/login", follow_redirects=False)
    assert response.status_code == 403
    assert "Naver API 검수 요청" in response.json()["detail"]

def test_logout():
    response = client.post("/api/v1/auth/logout")
    assert response.status_code == 200
    assert response.json() == {"detail": "로그아웃 되었습니다."}

def test_token_refresh_missing_cookie():
    response = client.get("/api/v1/auth/token/refresh")
    assert response.status_code == 401
    assert response.json()["detail"] == "Refresh token is missing."
