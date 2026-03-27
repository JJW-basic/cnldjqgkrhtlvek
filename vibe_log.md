# Vibe Log

## [2026-03-27 15:42] - ✅ DB 제거 및 회원가입 코드 정리 (No-DB / OAuth-only 구조로 리팩토링)

* **변경된 파일:**
  - `app/main.py`
  - `app/core/config.py`
  - `app/apis/v1/__init__.py`
  - `app/apis/v1/auth_routers.py`
  - `app/dtos/auth.py`
  - `app/services/jwt.py`
  - `app/utils/jwt/tokens.py`
  - `app/dependencies/security.py`
  - `docker-compose.yml`
  - `pyproject.toml`
  - `envs/example.local.env`
  - `envs/example.prod.env`

* **삭제된 파일/디렉토리:**
  - `app/db/` (Tortoise ORM 설정, Aerich 마이그레이션 전체)
  - `app/models/` (DB 테이블 모델 전체)
  - `app/repositories/` (DB 접근 계층 전체)
  - `app/services/auth.py` (회원가입/DB 기반 인증 로직)
  - `app/services/users.py` (DB 기반 사용자 관리 로직)
  - `app/apis/v1/user_routers.py` (DB 의존 사용자 API)
  - `app/dtos/users.py` (DB 모델 의존 DTO)
  - `app/dtos/base.py` (미참조 Base DTO)
  - `app/utils/security.py` (bcrypt 비밀번호 해싱)
  - `app/utils/common.py` (전화번호 정규화 유틸)
  - `app/validators/user_validators.py` (회원가입 입력 검증)
  - `app/tests/` (DB 의존 테스트 전체)

* **핵심 변경 사항:**
  - [논리]: 구현 목표인 만성질환 예측 AI 서비스는 DB를 사용하지 않고 외부 OAuth 인증만 사용하므로, Tortoise ORM / MySQL / Aerich / bcrypt / 회원가입 관련 코드를 전면 제거하여 불필요한 의존성과 복잡도를 제거함
  - [기능 제거]: 회원가입(`/auth/signup`), DB 기반 로그인(`/auth/login`), 사용자 정보 조회/수정(`/users/me`) 엔드포인트 삭제
  - [기능 추가]: 외부 OAuth 콜백 플레이스홀더 엔드포인트(`POST /auth/oauth/callback`) 추가 — OAuth Provider 연동 구현 예정
  - [기능 유지]: JWT Access/Refresh Token 발급·검증 로직 유지 (`GET /auth/token/refresh`)
  - [구조 변경]: `Token.for_user(user)` → `Token.for_payload(payload)` 로 변경하여 User DB 모델 의존성 완전 제거
  - [구조 변경]: `get_request_user` 의존성이 DB 조회 없이 JWT payload(`dict`)를 반환하도록 변경
  - [인프라]: `docker-compose.yml`에서 MySQL 서비스 및 관련 볼륨(`mysql_data`, `static_volume`) 제거, fastapi/ai-worker의 MySQL 의존성 제거
  - [의존성]: `pyproject.toml`에서 `aerich`, `asyncmy`, `bcrypt`, `passlib`, `tortoise-orm`, `types-passlib`, `types-python-dateutil` 제거

* **결과 확인:** 파일 구조 정리 완료. 서버 기동 시 DB 연결 없이 FastAPI 앱이 정상 시작되는 구조. OAuth 연동 및 AI 모델 결합은 다음 단계에서 진행 예정.

## [2025-07-10 15:00] - ✅ UI + AI 모델 통합 및 전체 서비스 연결

* **변경된 파일:**
  - `ai_worker/main.py`
  - `ai_worker/schemas/__init__.py`
  - `ai_worker/core/config.py`
  - `ai_worker/Dockerfile`
  - `ai_worker/models/inference.py`
  - `app/main.py`
  - `app/core/config.py`
  - `app/apis/v1/__init__.py`
  - `app/apis/v1/prediction_routers.py` (신규)
  - `app/dtos/prediction.py` (신규)
  - `app/services/prediction.py` (신규)
  - `src/app/components/SurveyPage.tsx`
  - `src/app/components/LoginPage.tsx`
  - `src/app/components/Layout.tsx`
  - `src/app/main.tsx` (신규)
  - `src/index.html` (신규)
  - `nginx/default.conf`
  - `docker-compose.yml`
  - `pyproject.toml`
  - `package.json` (신규)
  - `vite.config.ts` (신규)
  - `tsconfig.json` (신규)
  - `.env`

* **핵심 변경 사항:**
  - [논리]: ChronicDiseasePrediction_AI_ServiceSystem_Architecture.png의 흐름(React→FastAPI→Redis→AI Worker→Redis→FastAPI→React)에 맞춰 누락된 모든 연결 고리를 구현
  - [기능 추가]: `ai_worker/main.py` — Redis BRPOP 블로킹 큐 리스닝 + ChronicDiseasePredictor 추론 루프 구현
  - [기능 추가]: `ai_worker/schemas/__init__.py` — FastAPI/Worker 공유 Pydantic 스키마 (PredictionTask, PredictionResult)
  - [기능 추가]: `app/apis/v1/prediction_routers.py` — POST /prediction/ (태스크 제출), GET /prediction/{task_id} (결과 폴링)
  - [기능 추가]: `app/services/prediction.py` — Redis lpush 태스크 발행 + get 결과 조회
  - [기능 수정]: `SurveyPage.tsx` handleSubmit — mock 데이터 제거, 실제 FastAPI 호출 + 폴링 로직으로 교체
  - [기능 수정]: `ai_worker/Dockerfile` — CMD를 `echo hello world`에서 `python -m ai_worker.main`으로 수정
  - [기능 수정]: `nginx/default.conf` — React SPA 정적 파일 서빙(try_files) + /api/ 프록시 통합
  - [기능 수정]: `docker-compose.yml` — frontend_dist 볼륨 추가, Nginx에 SPA 파일 마운트
  - [기능 수정]: `app/main.py` — CORSMiddleware 추가
  - [의존성]: `pyproject.toml` ai 그룹에 joblib, numpy, pandas 추가
  - [버그 수정]: `ai_worker/models/inference.py` — 존재하지 않는 `from schemas import HealthPredictionResult` 제거
  - [버그 수정]: LoginPage/Layout — `figma:asset` import 제거 (Vite 빌드 오류 방지)
  - [인프라]: `package.json`, `vite.config.ts`, `tsconfig.json` 신규 생성으로 React 빌드 환경 구축

* **결과 확인:** 아키텍처 흐름 전 구간 연결 완료. 로컬 테스트 및 Docker Compose 실행 준비 상태.

## [2025-07-10 18:45] - ✅ 로컬 테스트 완료 (Docker Compose 전체 스택)

* **변경된 파일:**
  - `ai_worker/Dockerfile`
  - `docker-compose.yml`
  - `src/app/components/AIModelPage.tsx`
  - `src/app/components/TechStackPage.tsx`
  - `src/vite-env.d.ts` (신규)
  - `tsconfig.json`

* **핵심 변경 사항:**
  - [버그 수정]: `figma:asset` import → 빈 문자열 상수로 교체 (Vite 빌드 오류 해결)
  - [버그 수정]: `tsconfig.json`에 `src/app/components/ui` 제외 처리 (shadcn 미설치 의존성 타입 오류 해결)
  - [버그 수정]: `src/vite-env.d.ts` 추가 (`import.meta.env` 타입 선언)
  - [버그 수정]: `docker-compose.yml` multi-platform 제거, `dist/` 바인드 마운트로 변경
  - [버그 수정]: `ai_worker/Dockerfile` CMD를 `uv run` → `/app/.venv/bin/python` 직접 실행으로 변경 (venv 인식 문제 해결)
  - [버그 수정]: `docker-compose.yml` ai-worker에 `PYTHONUNBUFFERED=1` 추가

* **결과 확인:**
  - `npm run build` ✅ (1599 modules, 4.94s)
  - `docker compose build` ✅ (fastapi, ai-worker 이미지 빌드 성공)
  - `docker compose up -d` ✅ (4개 컨테이너 모두 Up)
  - `GET http://localhost/` → HTTP 200, React SPA index.html 반환 ✅
  - `GET http://localhost/api/openapi.json` → HTTP 200, /api/v1/prediction/ 엔드포인트 확인 ✅
  - `POST http://localhost/api/v1/prediction/` → task_id 발급 ✅
  - `GET http://localhost/api/v1/prediction/{task_id}` → `{"status":"completed","DJ8_pre":1,"DI1_pre":0,"DE1_pre":0,"DI2_pre":0}` ✅
  - AI Worker 로그: `[Worker] Task ... 완료` ✅

## [2025-07-10 20:30] - ✅ 카카오/네이버 OAuth 로그인 구현 완료

* **변경된 파일:**
  - `app/core/config.py`
  - `app/apis/v1/auth_routers.py`
  - `app/dtos/auth.py`
  - `src/app/components/LoginPage.tsx`
  - `src/app/components/OAuthCallbackPage.tsx` (신규)
  - `src/app/routes.ts`
  - `src/app/components/Layout.tsx`
  - `.env`
  - `DEPLOYMENT_GUIDE.md`

* **핵심 변경 사항:**
  - [논리]: 기존 mock navigate 방식을 실제 OAuth Authorization Code Flow로 교체. FastAPI가 카카오/네이버 인가 서버로 redirect → 인가 코드 수신 → 토큰 교환 → 사용자 ID 조회 → 내부 JWT 발급의 전체 흐름 구현
  - [기능 추가]: `GET /api/v1/auth/kakao/login` — 카카오 인가 서버로 307 redirect
  - [기능 추가]: `GET /api/v1/auth/kakao/callback` — 인가 코드 → 카카오 토큰 교환 → 사용자 ID 조회 → JWT 발급
  - [기능 추가]: `GET /api/v1/auth/naver/login` — 네이버 인가 서버로 307 redirect (state 포함)
  - [기능 추가]: `GET /api/v1/auth/naver/callback` — 인가 코드 → 네이버 토큰 교환 → 사용자 ID 조회 → JWT 발급
  - [기능 추가]: `OAuthCallbackPage.tsx` — `/oauth/callback/:provider` 라우트에서 code 파라미터 수신 → FastAPI 콜백 호출 → access_token sessionStorage 저장 → /services 이동
  - [기능 수정]: `LoginPage.tsx` — mock navigate 제거, `window.location.href`로 실제 OAuth redirect
  - [기능 수정]: `Layout.tsx` — 로그아웃 시 sessionStorage 토큰 제거
  - [설정 추가]: `config.py`에 KAKAO/NAVER CLIENT_ID, CLIENT_SECRET, REDIRECT_URI 필드 추가
  - [설정 추가]: `.env`에 KAKAO_REDIRECT_URI, NAVER_REDIRECT_URI 추가

* **결과 확인:**
  - `npm run build` ✅ (1600 modules, 6.12s)
  - `docker compose build fastapi` ✅
  - `docker compose up -d` ✅ (4개 컨테이너 모두 Up)
  - `GET http://localhost/` → HTTP 200 ✅
  - `GET /api/v1/auth/kakao/login` → 307 redirect → `https://kauth.kakao.com/oauth/authorize?client_id=...` ✅
  - `GET /api/v1/auth/naver/login` → 307 redirect → `https://nid.naver.com/oauth2.0/authorize?client_id=...` ✅
  - OpenAPI 경로 확인: `/api/v1/auth/kakao/login`, `/api/v1/auth/kakao/callback`, `/api/v1/auth/naver/login`, `/api/v1/auth/naver/callback`, `/api/v1/auth/token/refresh` ✅

## [2025-07-10 21:00] - ✅ 보안 취약점 2건 해결 (네이버 CSRF 방어 + 설문 API 인증)

* **변경된 파일:**
  - `app/apis/v1/auth_routers.py`
  - `app/apis/v1/prediction_routers.py`
  - `src/app/components/SurveyPage.tsx`

* **핵심 변경 사항:**
  - [논리 1 — CSRF 방어]: 네이버 OAuth state 값을 Redis에 TTL 300초(5분)로 저장. 콜백 수신 시 `getdel`로 조회+삭제(1회용) 처리하여 재사용 공격 차단. 불일치/만료 시 400 반환
  - [논리 2 — API 인증]: 설문 제출(`POST /prediction/`)과 결과 조회(`GET /prediction/{task_id}`) 엔드포인트에 `Depends(get_request_user)` 추가. 유효한 JWT 없이 호출 시 401 반환
  - [기능 수정]: `SurveyPage.tsx` — `sessionStorage`에서 access_token을 읽어 `Authorization: Bearer` 헤더로 전달

* **결과 확인:**
  - `npm run build` ✅
  - `docker compose build fastapi` ✅
  - 인증 없이 `POST /api/v1/prediction/` → HTTP 401 ✅
  - `GET /api/v1/auth/naver/login` → 307 redirect, Redis에 `oauth:naver:state:*` 키 저장 확인 ✅
  - 위조 state로 콜백 호출 시 400 반환 (Redis key 없음) ✅

## [2025-07-10 22:30] - ✅ 인증 보호 라우트 / 로그아웃 / access_token 자동 갱신 구현

* **변경된 파일:**
  - `src/app/lib/apiClient.ts` (신규)
  - `src/app/components/ProtectedLayout.tsx` (신규)
  - `src/app/routes.tsx` (routes.ts → tsx 변환 + 보호 라우트 적용)
  - `src/app/App.tsx`
  - `src/app/components/Layout.tsx`
  - `src/app/components/OAuthCallbackPage.tsx`
  - `src/app/components/SurveyPage.tsx`
  - `app/apis/v1/auth_routers.py`
  - `DEPLOYMENT_GUIDE.md`

* **핵심 변경 사항:**
  - [논리 1 — 보호 라우트]: `ProtectedLayout` 컴포넌트가 sessionStorage의 access_token 유무를 확인. 없으면 `<Navigate to="/" replace />`로 즉시 로그인 페이지 이동. `/survey`, `/services`, `/dashboard`, `/ai-model`, `/tech-stack` 5개 경로 모두 보호 적용
  - [논리 2 — 인증된 사용자 루트 리다이렉트]: `RootRedirect` 컴포넌트가 루트(`/`) 접근 시 access_token 존재 여부에 따라 `/services` 또는 로그인 페이지 렌더링
  - [논리 3 — 로그아웃]: `POST /api/v1/auth/logout` 엔드포인트 추가. `set-cookie: refresh_token=""; Max-Age=0`으로 서버에서 쿠키 삭제. Layout의 `handleLogout`이 서버 API 호출 후 sessionStorage 제거 → `/` 이동
  - [논리 4 — 토큰 자동 갱신]: `apiClient.ts`의 `apiFetch` wrapper가 401 응답 수신 시 `/api/v1/auth/token/refresh` 자동 호출. 갱신 성공 시 원래 요청 재시도, 실패 시 sessionStorage 초기화 후 `/` 강제 이동. 동시 다중 요청 시 refresh 중복 방지를 위한 큐(refreshQueue) 패턴 적용
  - [기능 수정]: `SurveyPage.tsx` — 직접 fetch 호출을 `apiFetch`로 교체 (자동 갱신 적용)
  - [기능 수정]: `OAuthCallbackPage.tsx` — `credentials: "include"` 추가 (쿠키 전달 보장)
  - [파일 변경]: `routes.ts` → `routes.tsx` (JSX 포함으로 확장자 변경 필요)

* **결과 확인:**
  - `npm run build` ✅ (1602 modules, 7.01s)
  - `docker compose build fastapi` ✅
  - `docker compose up -d` ✅ (4개 컨테이너 모두 Up)
  - `GET http://localhost/` → HTTP 200 ✅
  - `GET http://localhost/services` → HTTP 200 (SPA index.html 반환, 클라이언트에서 인증 가드 동작) ✅
  - `GET /api/v1/auth/token/refresh` (쿠키 없음) → HTTP 401 ✅
  - `POST /api/v1/auth/logout` → HTTP 200, `set-cookie: refresh_token=""; Max-Age=0` ✅
  - OpenAPI 경로: `/api/v1/auth/logout` 등록 확인 ✅

## [2025-07-10 23:15] - ✅ 탭 간 토큰 공유 / 비활동 자동 로그아웃 구현

* **변경된 파일:**
  - `src/app/lib/tokenStore.ts` (신규)
  - `src/app/lib/useIdleLogout.ts` (신규)
  - `src/app/lib/apiClient.ts`
  - `src/app/components/ProtectedLayout.tsx`
  - `src/app/components/OAuthCallbackPage.tsx`
  - `src/app/components/Layout.tsx`
  - `src/app/routes.tsx`
  - `DEPLOYMENT_GUIDE.md`

* **핵심 변경 사항:**
  - [논리 1 — 탭 간 토큰 공유]: `tokenStore.ts` 구현. 저장소는 sessionStorage(탭/브라우저 종료 시 자동 소멸). BroadcastChannel로 탭 간 동기화 — 새 탭이 TOKEN_REQUEST 브로드캐스트 → 기존 탭이 TOKEN_RESPONSE로 응답 → 새 탭 sessionStorage에 저장. 로그아웃 시 TOKEN_CLEAR 브로드캐스트로 모든 탭 동시 초기화
  - [논리 2 — 비활동 자동 로그아웃]: `useIdleLogout.ts` 구현. mousedown/keydown/touchstart/scroll/click 이벤트 감지 시 60분 타이머 리셋. 5분 쿨다운으로 서버 토큰 갱신 (활동 중 만료 방지). 60분 비활동 시 clearToken() + POST /auth/logout + 로그인 페이지 이동
  - [논리 3 — ProtectedLayout 초기화]: 마운트 시 getToken() 비동기 호출로 탭 간 동기화 대기(최대 500ms). 로딩 중 스피너 표시. 토큰 확인 후 useIdleLogout 훅 활성화
  - [논리 4 — RootRedirect 비동기화]: 루트 접근 시도 getToken() 비동기 확인으로 새 탭에서도 기존 탭 토큰 인식 후 /services 이동
  - [기능 수정]: apiClient.ts — tokenStore.getToken() 사용, API_BASE 제거 (상대 경로로 통일)
  - [기능 수정]: OAuthCallbackPage — tokenStore.setToken() 사용
  - [기능 수정]: Layout — tokenStore.clearToken() 사용 (모든 탭 브로드캐스트)

* **결과 확인:**
  - `npm run build` ✅ (1604 modules, 5.23s)
  - `docker compose up -d` ✅ (4개 컨테이너 모두 Up)
  - `GET http://localhost/` → HTTP 200 ✅
  - `POST /api/v1/auth/logout` → `set-cookie: refresh_token=""; Max-Age=0` ✅
  - `GET /api/v1/auth/token/refresh` (쿠키 없음) → HTTP 401 ✅
  - 전체 API 경로 8개 정상 등록 확인 ✅

## [2025-07-10 23:45] - ✅ 비활동 타이머 서버 설정값 자동 동기화 구현

* **변경된 파일:**
  - `app/dtos/auth.py`
  - `app/apis/v1/auth_routers.py`
  - `src/app/lib/tokenStore.ts`
  - `src/app/lib/apiClient.ts`
  - `src/app/lib/useIdleLogout.ts`
  - `src/app/components/OAuthCallbackPage.tsx`
  - `src/app/components/ProtectedLayout.tsx`
  - `DEPLOYMENT_GUIDE.md`

* **핵심 변경 사항:**
  - [논리]: 비활동 타이머(idleMs)가 서버의 ACCESS_TOKEN_EXPIRE_MINUTES와 하드코딩으로 분리되어 있던 문제를 해결. 서버가 로그인/갱신 응답에 expires_in(초)을 포함하여 내려주고, 프론트엔드가 이를 tokenStore에 저장 후 ProtectedLayout이 getExpiresInMs()로 읽어 useIdleLogout에 전달하는 단방향 흐름 구축
  - [기능 추가]: `OAuthLoginResponse`, `TokenRefreshResponse` DTO에 `expires_in: int` 필드 추가
  - [기능 추가]: 카카오/네이버 콜백, token/refresh 응답에 `expires_in=config.ACCESS_TOKEN_EXPIRE_MINUTES * 60` 포함
  - [기능 추가]: `tokenStore.ts` — KEY_EXPIRES_IN 저장/조회, TOKEN_RESPONSE 브로드캐스트에 expiresIn 포함, `getExpiresInMs()` 함수 추가 (없으면 기본 60분 반환)
  - [기능 수정]: `apiClient.ts` — refreshAccessToken()이 `{ access_token, expires_in }` 객체 반환, setToken에 expires_in 전달
  - [기능 수정]: `useIdleLogout.ts` — 활동 감지 시 갱신 응답의 expires_in도 tokenStore에 저장
  - [기능 수정]: `OAuthCallbackPage.tsx` — setToken(token, provider, expires_in) 호출
  - [기능 수정]: `ProtectedLayout.tsx` — useIdleLogout(handleIdle, getExpiresInMs()) 로 하드코딩 제거

* **결과 확인:**
  - `npm run build` ✅ (1604 modules, 4.79s)
  - `docker compose build fastapi` ✅
  - `docker compose up -d` ✅
  - OpenAPI: OAuthLoginResponse fields `['access_token', 'provider', 'sub', 'expires_in']` ✅
  - OpenAPI: TokenRefreshResponse fields `['access_token', 'expires_in']` ✅
  - `GET http://localhost/` → HTTP 200 ✅

## [2025-07-11 00:10] - ✅ 3중 인증 가드 구조 완성 (Layout 레벨 즉시 차단 추가)

* **변경된 파일:**
  - `src/app/components/Layout.tsx`
  - `DEPLOYMENT_GUIDE.md`

* **핵심 변경 사항:**
  - [논리]: 기존 ProtectedLayout(Layer 2)만으로는 Layout 렌더링 시점에 비공개 경로가 잠깐 노출될 수 있는 구조적 취약점 존재. Layout 레벨(Layer 1)에서 getTokenSync()로 sessionStorage를 동기 즉시 확인하여 토큰 없는 비공개 경로 접근을 렌더링 전에 차단
  - [기능 추가]: `PUBLIC_PATHS` 상수 — 토큰 없이 허용할 경로 목록 (`/`, `/oauth/callback/*`)
  - [기능 추가]: `NO_HEADER_PATHS` 상수 — 헤더 없이 렌더링할 경로 목록 (로그인, OAuth 콜백)
  - [기능 추가]: `isPublicPath()`, `isNoHeaderPath()` 헬퍼 함수로 경로 판별 로직 명시화
  - [기능 수정]: Layout의 `isLogin` 단순 조건 → `isNoHeaderPath()` 함수로 교체 (OAuth 콜백 경로도 헤더 미표시)
  - [기능 추가]: Layout 레벨 인증 가드 — `!isPublicPath() && !getTokenSync()` 시 즉시 `<Navigate to="/" replace />`

  3중 가드 구조:
  - Layer 1 (Layout): getTokenSync() 동기 즉시 차단 — 렌더링 전 처리
  - Layer 2 (ProtectedLayout): getToken() 비동기 탭 간 동기화 확인 + 비활동 타이머
  - Layer 3 (FastAPI): JWT Bearer 서명/만료 서버 검증 → HTTP 401

* **결과 확인:**
  - `npm run build` ✅ (1604 modules, 5.00s)
  - `docker compose up -d` ✅
  - `GET http://localhost/` → HTTP 200 (SPA index.html) ✅
  - `POST /api/v1/prediction/` (토큰 없음) → HTTP 401 ✅
  - `GET /api/v1/prediction/fake-id` (토큰 없음) → HTTP 401 ✅
  - 경로별 접근 제어 매트릭스 DEPLOYMENT_GUIDE.md에 문서화 ✅

## [2025-07-11 00:30] - ✅ 새 탭 인증 토큰 인식 버그 수정 (Layout 인증 가드 제거)

* **변경된 파일:**
  - `src/app/components/Layout.tsx`
  - `DEPLOYMENT_GUIDE.md`

* **핵심 변경 사항:**
  - [근본 원인]: Layout의 Layer 1 가드가 getTokenSync()(동기)로만 확인하여 새 탭에서 sessionStorage가 비어있을 때 BroadcastChannel 응답을 기다리지 않고 즉시 `/`로 차단. ProtectedLayout(Layer 2)까지 도달하지 못하는 구조적 문제
  - [해결 방안]: Layout에서 인증 가드 완전 제거. 인증 책임을 ProtectedLayout 단일 지점으로 통일. Layout은 헤더 표시 분기 역할만 담당
  - [재발 방지]: 인증 가드 레이어를 ProtectedLayout(클라이언트) + FastAPI get_request_user(서버) 2개로 명확히 분리. Layout은 UI 레이아웃 책임만 보유
  - [기능 수정]: `isNoHeaderPath()` — `pathname === "/"` 또는 `/oauth/callback/*` 시 헤더 미표시
  - [기능 제거]: `isPublicPath()`, `PUBLIC_PATHS`, Layout 레벨 `<Navigate>` 가드 완전 제거

* **결과 확인:**
  - `npm run build` ✅ (1604 modules, 5.00s)
  - `docker compose up -d` ✅
  - `GET http://localhost/` → HTTP 200 ✅
  - `POST /api/v1/prediction/` (토큰 없음) → HTTP 401 ✅
  - 새 탭에서 보호 경로 접근 시: ProtectedLayout이 BroadcastChannel 500ms 대기 → 기존 탭 토큰 수신 → 서비스 정상 접근 ✅

## [2025-07-11 00:50] - ✅ useAuth 훅 추출로 인증 판단 SRP 적용

* **변경된 파일:**
  - `src/app/lib/useAuth.ts` (신규)
  - `src/app/components/ProtectedLayout.tsx`
  - `src/app/routes.tsx`
  - `DEPLOYMENT_GUIDE.md`

* **핵심 변경 사항:**
  - [논리]: ProtectedLayout과 RootRedirect가 각각 독립적으로 getToken() 비동기 확인 + 상태 관리 + 스피너 로직을 중복 구현하던 SRP 위반 구조를 개선. useAuth 훅 단일 지점으로 인증 판단 로직 추출
  - [기능 추가]: `useAuth.ts` — AuthState("loading"|"authenticated"|"unauthenticated") 반환. getTokenSync() 동기 선확인 후 getToken() 비동기 BroadcastChannel 대기
  - [기능 수정]: `ProtectedLayout.tsx` — useAuth() 훅 사용, 상태 관리 코드 제거, Spinner 인라인 컴포넌트로 단순화
  - [기능 수정]: `routes.tsx` — RootRedirect에서 useState/useEffect/getToken 직접 사용 제거, useAuth() 훅으로 교체
  - 각 컴포넌트의 역할: useAuth(인증 판단) / ProtectedLayout(가드+타이머) / RootRedirect(루트 분기) / Layout(헤더 분기)

* **결과 확인:**
  - `npm run build` ✅ (1605 modules, 4.43s)
  - `docker compose up -d` ✅
  - `GET http://localhost/` → 200 ✅
  - `POST /api/v1/prediction/` (토큰 없음) → 401 ✅

## [2025-07-11 01:10] - ✅ useAuth 훅 인증 로직 완전 통합 (SRP 완성)

* **변경된 파일:**
  - `src/app/lib/useAuth.ts`
  - `DEPLOYMENT_GUIDE.md`

* **핵심 변경 사항:**
  - [논리]: "인증 관련 로직 추가 시 useAuth.ts만 수정하면 ProtectedLayout과 RootRedirect 양쪽에 자동 반영" Best Practice를 실제 코드로 구현. 기존에 분산되어 있던 토큰 만료 감지 로직을 useAuth 단일 훅으로 통합
  - [기능 추가 — 로직 3]: 토큰 만료 임박 자동 갱신 — JWT payload의 exp 클레임 디코딩(atob)으로 만료까지 남은 시간 계산, 만료 30초 전 /auth/token/refresh 자동 호출. 갱신 성공 시 tokenStore 업데이트 + state 재트리거로 타이머 재설정. 실패 시 clearToken() + "unauthenticated" 전환
  - [기능 추가 — 로직 4]: 타 탭 로그아웃 즉시 반영 — useAuth 내부에서 BroadcastChannel("auth_token_sync") 구독. TOKEN_CLEAR 수신 시 즉시 setState("unauthenticated") → ProtectedLayout/RootRedirect 양쪽에서 자동으로 로그인 페이지 이동
  - [설계]: getTokenRemainingMs() 헬퍼 함수 — JWT 서명 검증 없이 payload만 디코딩 (클라이언트 UX 전용, 보안 검증은 서버에서 수행)

* **결과 확인:**
  - `npm run build` ✅ (1605 modules, 4.70s)
  - `docker compose up -d` ✅
  - `GET http://localhost/` → 200 ✅
  - `POST /api/v1/prediction/` (토큰 없음) → 401 ✅
  - `POST /api/v1/auth/logout` → 200, set-cookie Max-Age=0 ✅
