import pytest
from fastapi import HTTPException

from app.services.jwt import JwtService


def test_issue_jwt_pair():
    service = JwtService()
    payload = {"sub": "12345", "provider": "kakao"}
    tokens = service.issue_jwt_pair(payload)

    assert "access_token" in tokens
    assert "refresh_token" in tokens

    access_token = tokens["access_token"]
    refresh_token = tokens["refresh_token"]

    # verify
    verified_access = service.verify_jwt(str(access_token), "access")
    assert verified_access.payload["sub"] == "12345"
    assert verified_access.payload["provider"] == "kakao"

    verified_refresh = service.verify_jwt(str(refresh_token), "refresh")
    assert verified_refresh.payload["sub"] == "12345"
    assert verified_refresh.payload["provider"] == "kakao"

def test_refresh_jwt():
    service = JwtService()
    payload = {"sub": "user_1", "provider": "naver"}
    tokens = service.issue_jwt_pair(payload)
    refresh_token_str = str(tokens["refresh_token"])

    new_access_token = service.refresh_jwt(refresh_token_str)
    assert new_access_token is not None

    verified = service.verify_jwt(str(new_access_token), "access")
    assert verified.payload["sub"] == "user_1"

def test_verify_invalid_token():
    service = JwtService()
    with pytest.raises(HTTPException) as exc:
        service.verify_jwt("invalid.token.string", "access")
    assert exc.value.status_code == 400
    assert exc.value.detail == "Provided invalid token."
