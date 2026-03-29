import logging
from typing import Annotated

import httpx
from fastapi import APIRouter, Cookie, Depends, HTTPException, status
from fastapi.responses import JSONResponse as Response, RedirectResponse

from app.core.config import Config
from app.dtos.auth import OAuthLoginResponse, TokenRefreshResponse
from app.services.jwt import JwtService

auth_router = APIRouter(prefix="/auth", tags=["auth"])
config = Config()
logger = logging.getLogger(__name__)


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
    # 1) 인가 코드 → 카카오 액세스 토큰 교환
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
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="카카오 인증에 실패했습니다.")

    kakao_access_token = token_res.json().get("access_token")

    # 2) 사용자 정보 조회
    async with httpx.AsyncClient() as client:
        user_res = await client.get(
            "https://kapi.kakao.com/v2/user/me",
            headers={"Authorization": f"Bearer {kakao_access_token}"},
        )
    if user_res.status_code != 200:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="카카오 사용자 정보 조회에 실패했습니다.")

    user_data = user_res.json()
    kakao_id = str(user_data.get("id"))
    kakao_account = user_data.get("kakao_account", {})

    # 3) 본인인증 완료 여부 검증 — is_certified, certified_at
    #
    # 카카오 API 동의항목 동작 방식:
    #   - 앱 동의항목에 본인인증 항목이 설정된 경우:
    #       needs_agreement=False → is_certified, certified_at 값 확인 가능
    #       needs_agreement=True  → 사용자가 동의 거부 → 미완료 처리
    #   - 앱 동의항목에 본인인증 항목이 없는 경우:
    #       is_certified_needs_agreement 키 자체가 응답에 없음
    #
    # 처리 전략:
    #   - needs_agreement 키가 없음 → 앱에 동의항목 미설정 → id만으로 통과
    #   - needs_agreement=True     → 사용자 동의 거부 → 403
    #   - needs_agreement=False    → is_certified=True + certified_at 존재 확인

    logger.info("[kakao_callback] id=%s, kakao_account keys=%s", kakao_id, list(kakao_account.keys()))

    needs_agreement_key = "is_certified_needs_agreement"

    if needs_agreement_key in kakao_account:
        # 동의항목이 앱에 설정된 경우 → 실제 본인인증 값 검증
        needs_agreement = kakao_account[needs_agreement_key]
        is_certified = kakao_account.get("is_certified", False)
        certified_at = kakao_account.get("certified_at")

        logger.info("[kakao_callback] needs_agreement=%s, is_certified=%s, certified_at=%s",
                    needs_agreement, is_certified, certified_at)

        if needs_agreement:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="본인인증 정보 제공에 동의하지 않아 서비스를 이용할 수 없습니다. 카카오 로그인 시 본인인증 정보 제공에 동의해 주세요.",
            )
        if not is_certified or not certified_at:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    "본인인증을 완료한 카카오 계정만 이용할 수 있습니다. "
                    "카카오 계정 설정 → 보안 → 본인인증을 완료한 후 다시 시도해 주세요."
                ),
            )
    else:
        # 동의항목 미설정 → 본인인증 검증 없이 id만으로 통과 (개발/테스트 환경)
        logger.info("[kakao_callback] is_certified_needs_agreement not in response — skipping cert check")

    # 4) 내부 JWT 발급
    payload = {"sub": kakao_id, "provider": "kakao"}
    tokens = jwt_service.issue_jwt_pair(payload)
    access_token = tokens["access_token"]
    refresh_token = tokens["refresh_token"]

    resp = Response(
        content=OAuthLoginResponse(
            access_token=str(access_token),
            provider="kakao",
            sub=kakao_id,
            expires_in=config.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        ).model_dump(),
        status_code=status.HTTP_200_OK,
    )
    resp.set_cookie(
        key="refresh_token",
        value=str(refresh_token),
        httponly=True,
        secure=config.ENV == "prod",
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
    if not r.getdel(state_key):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="유효하지 않거나 만료된 인증 요청입니다. 다시 로그인해 주세요.")

    # 1) 인가 코드 → 네이버 액세스 토큰 교환
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
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="네이버 인증에 실패했습니다.")

    naver_access_token = token_res.json().get("access_token")

    # 2) 사용자 정보 조회
    async with httpx.AsyncClient() as client:
        user_res = await client.get(
            "https://openapi.naver.com/v1/nid/me",
            headers={"Authorization": f"Bearer {naver_access_token}"},
        )
    if user_res.status_code != 200:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="네이버 사용자 정보 조회에 실패했습니다.")

    naver_profile = user_res.json().get("response", {})
    naver_id = str(naver_profile.get("id", ""))

    logger.info("[naver_callback] id=%s, profile keys=%s", naver_id, list(naver_profile.keys()))

    # 3) 본인인증 완료 여부 검증 — is_certified 필드 확인
    #    - 필드가 응답에 없으면 앱 설정 미완료 → 검증 건너뜀 (개발/테스트 환경)
    #    - 필드가 있으면 "true" 여부 확인 (문자열로 반환됨)
    if "is_certified" in naver_profile:
        is_certified = str(naver_profile["is_certified"]).lower() == "true"
        logger.info("[naver_callback] is_certified=%s", is_certified)
        if not is_certified:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    "본인인증을 완료한 네이버 계정만 이용할 수 있습니다. "
                    "네이버 계정 설정 → 보안 → 본인인증을 완료한 후 다시 시도해 주세요."
                ),
            )
    else:
        logger.info("[naver_callback] is_certified not in response — skipping cert check")

    # 4) 내부 JWT 발급
    payload = {"sub": naver_id, "provider": "naver"}
    tokens = jwt_service.issue_jwt_pair(payload)
    access_token = tokens["access_token"]
    refresh_token = tokens["refresh_token"]

    resp = Response(
        content=OAuthLoginResponse(
            access_token=str(access_token),
            provider="naver",
            sub=naver_id,
            expires_in=config.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        ).model_dump(),
        status_code=status.HTTP_200_OK,
    )
    resp.set_cookie(
        key="refresh_token",
        value=str(refresh_token),
        httponly=True,
        secure=config.ENV == "prod",
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
        content=TokenRefreshResponse(
            access_token=str(access_token),
            expires_in=config.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        ).model_dump(),
        status_code=status.HTTP_200_OK,
    )


# ── 로그아웃 ────────────────────────────────────────────────────────────────────
@auth_router.post("/logout", status_code=status.HTTP_200_OK)
async def logout() -> Response:
    resp = Response(content={"detail": "로그아웃 되었습니다."}, status_code=status.HTTP_200_OK)
    resp.delete_cookie(key="refresh_token", httponly=True, samesite="lax")
    return resp
