from typing import Annotated

import httpx
from fastapi import APIRouter, Cookie, Depends, HTTPException, status
from fastapi.responses import JSONResponse as Response, RedirectResponse

from app.core.config import Config
from app.dtos.auth import OAuthLoginResponse, TokenRefreshResponse
from app.services.jwt import JwtService

auth_router = APIRouter(prefix="/auth", tags=["auth"])
config = Config()


# ── 카카오 로그인 시작 ──────────────────────────────────────────────────────────
@auth_router.get("/kakao/login", status_code=status.HTTP_302_FOUND)
async def kakao_login() -> RedirectResponse:
    if not config.KAKAO_CLIENT_ID:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="카카오 OAuth가 설정되지 않았습니다.")
    url = (
        "https://kauth.kakao.com/oauth/authorize"
        f"?client_id={config.KAKAO_CLIENT_ID}"
        f"&redirect_uri={config.KAKAO_REDIRECT_URI}"
        "&response_type=code"
    )
    return RedirectResponse(url=url)


# ── 카카오 콜백 ────────────────────────────────────────────────────────────────
@auth_router.get("/kakao/callback", response_model=OAuthLoginResponse, status_code=status.HTTP_200_OK)
async def kakao_callback(
    code: str,
    jwt_service: Annotated[JwtService, Depends(JwtService)],
) -> Response:
    # 1) 인가 코드 → 액세스 토큰 교환
    async with httpx.AsyncClient() as client:
        token_res = await client.post(
            "https://kauth.kakao.com/oauth/token",
            data={
                "grant_type": "authorization_code",
                "client_id": config.KAKAO_CLIENT_ID,
                "client_secret": config.KAKAO_CLIENT_SECRET,
                "redirect_uri": config.KAKAO_REDIRECT_URI,
                "code": code,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
    if token_res.status_code != 200:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="카카오 토큰 발급 실패")

    kakao_access_token = token_res.json().get("access_token")

    # 2) 사용자 정보 조회
    async with httpx.AsyncClient() as client:
        user_res = await client.get(
            "https://kapi.kakao.com/v2/user/me",
            headers={"Authorization": f"Bearer {kakao_access_token}"},
        )
    if user_res.status_code != 200:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="카카오 사용자 정보 조회 실패")

    kakao_id = str(user_res.json().get("id"))

    # 3) 내부 JWT 발급
    payload = {"sub": kakao_id, "provider": "kakao"}
    tokens = jwt_service.issue_jwt_pair(payload)
    access_token = tokens["access_token"]
    refresh_token = tokens["refresh_token"]

    resp = Response(
        content=OAuthLoginResponse(
            access_token=str(access_token),
            provider="kakao",
            sub=kakao_id,
        ).model_dump(),
        status_code=status.HTTP_200_OK,
    )
    resp.set_cookie(
        key="refresh_token",
        value=str(refresh_token),
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=config.REFRESH_TOKEN_EXPIRE_MINUTES * 60,
    )
    return resp


# ── 네이버 로그인 시작 ──────────────────────────────────────────────────────────
@auth_router.get("/naver/login", status_code=status.HTTP_302_FOUND)
async def naver_login() -> RedirectResponse:
    if not config.NAVER_CLIENT_ID:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="네이버 OAuth가 설정되지 않았습니다.")
    import secrets

    import redis as redis_lib

    state = secrets.token_urlsafe(16)
    r = redis_lib.Redis(host=config.REDIS_HOST, port=config.REDIS_PORT, decode_responses=True)
    r.setex(f"oauth:naver:state:{state}", 300, "1")  # TTL 5분
    url = (
        "https://nid.naver.com/oauth2.0/authorize"
        f"?client_id={config.NAVER_CLIENT_ID}"
        f"&redirect_uri={config.NAVER_REDIRECT_URI}"
        "&response_type=code"
        f"&state={state}"
    )
    return RedirectResponse(url=url)


# ── 네이버 콜백 ────────────────────────────────────────────────────────────────
@auth_router.get("/naver/callback", response_model=OAuthLoginResponse, status_code=status.HTTP_200_OK)
async def naver_callback(
    code: str,
    state: str,
    jwt_service: Annotated[JwtService, Depends(JwtService)],
) -> Response:
    # 0) Redis state 검증 (CSRF 방어)
    import redis as redis_lib

    r = redis_lib.Redis(host=config.REDIS_HOST, port=config.REDIS_PORT, decode_responses=True)
    state_key = f"oauth:naver:state:{state}"
    if not r.getdel(state_key):  # 조회 + 즉시 삭제 (1회용)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="유효하지 않거나 만료된 state입니다.")

    # 1) 인가 코드 → 액세스 토큰 교환
    async with httpx.AsyncClient() as client:
        token_res = await client.post(
            "https://nid.naver.com/oauth2.0/token",
            params={
                "grant_type": "authorization_code",
                "client_id": config.NAVER_CLIENT_ID,
                "client_secret": config.NAVER_CLIENT_SECRET,
                "redirect_uri": config.NAVER_REDIRECT_URI,
                "code": code,
                "state": state,
            },
        )
    if token_res.status_code != 200:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="네이버 토큰 발급 실패")

    naver_access_token = token_res.json().get("access_token")

    # 2) 사용자 정보 조회
    async with httpx.AsyncClient() as client:
        user_res = await client.get(
            "https://openapi.naver.com/v1/nid/me",
            headers={"Authorization": f"Bearer {naver_access_token}"},
        )
    if user_res.status_code != 200:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="네이버 사용자 정보 조회 실패")

    naver_id = str(user_res.json().get("response", {}).get("id", ""))

    # 3) 내부 JWT 발급
    payload = {"sub": naver_id, "provider": "naver"}
    tokens = jwt_service.issue_jwt_pair(payload)
    access_token = tokens["access_token"]
    refresh_token = tokens["refresh_token"]

    resp = Response(
        content=OAuthLoginResponse(
            access_token=str(access_token),
            provider="naver",
            sub=naver_id,
        ).model_dump(),
        status_code=status.HTTP_200_OK,
    )
    resp.set_cookie(
        key="refresh_token",
        value=str(refresh_token),
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=config.REFRESH_TOKEN_EXPIRE_MINUTES * 60,
    )
    return resp


# ── 토큰 갱신 ──────────────────────────────────────────────────────────────────
@auth_router.get("/token/refresh", response_model=TokenRefreshResponse, status_code=status.HTTP_200_OK)
async def token_refresh(
    jwt_service: Annotated[JwtService, Depends(JwtService)],
    refresh_token: Annotated[str | None, Cookie()] = None,
) -> Response:
    if not refresh_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token is missing.")
    access_token = jwt_service.refresh_jwt(refresh_token)
    return Response(
        content=TokenRefreshResponse(access_token=str(access_token)).model_dump(),
        status_code=status.HTTP_200_OK,
    )
