import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from app.dependencies.security import get_request_user
from app.services.jwt import JwtService

@pytest.mark.asyncio
async def test_get_request_user_valid_token():
    service = JwtService()
    tokens = service.issue_jwt_pair({"sub": "user_123", "provider": "kakao"})
    access_token = str(tokens["access_token"])
    
    cred = HTTPAuthorizationCredentials(scheme="Bearer", credentials=access_token)
    user = await get_request_user(cred)
    
    assert user["sub"] == "user_123"
    assert user["provider"] == "kakao"

@pytest.mark.asyncio
async def test_get_request_user_invalid_token():
    cred = HTTPAuthorizationCredentials(scheme="Bearer", credentials="invalid.token.string")
    with pytest.raises(HTTPException) as exc:
        await get_request_user(cred)
    assert exc.value.status_code == 400

@pytest.mark.asyncio
async def test_get_request_user_missing_sub():
    service = JwtService()
    # Missing sub
    tokens = service.issue_jwt_pair({"provider": "kakao"})
    access_token = str(tokens["access_token"])
    
    cred = HTTPAuthorizationCredentials(scheme="Bearer", credentials=access_token)
    with pytest.raises(HTTPException) as exc:
        await get_request_user(cred)
    assert exc.value.status_code == 401
    assert exc.value.detail == "Authenticate Failed."
