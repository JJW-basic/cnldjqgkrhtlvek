from typing import Annotated

from fastapi import APIRouter, Cookie, Depends, HTTPException, status
from fastapi.responses import JSONResponse as Response

from app.dtos.auth import OAuthCallbackRequest, OAuthLoginResponse, TokenRefreshResponse
from app.services.jwt import JwtService

auth_router = APIRouter(prefix="/auth", tags=["auth"])


@auth_router.post("/oauth/callback", response_model=OAuthLoginResponse, status_code=status.HTTP_200_OK)
async def oauth_callback(
    request: OAuthCallbackRequest,
    jwt_service: Annotated[JwtService, Depends(JwtService)],
) -> Response:
    """외부 OAuth 인증 콜백 - OAuth Provider 연동 구현 예정"""
    # TODO: 외부 OAuth Provider 토큰 검증 및 사용자 정보 조회 후 내부 JWT 발급
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="OAuth 연동 구현 예정입니다.")


@auth_router.get("/token/refresh", response_model=TokenRefreshResponse, status_code=status.HTTP_200_OK)
async def token_refresh(
    jwt_service: Annotated[JwtService, Depends(JwtService)],
    refresh_token: Annotated[str | None, Cookie()] = None,
) -> Response:
    if not refresh_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token is missing.")
    access_token = jwt_service.refresh_jwt(refresh_token)
    return Response(
        content=TokenRefreshResponse(access_token=str(access_token)).model_dump(), status_code=status.HTTP_200_OK
    )
