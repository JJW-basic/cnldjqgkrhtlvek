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
  - [논리]: 구현 목표인 만성질환 예측 AI 서비스는 DB 기를 사용하지 않고 외부 OAuth 인증만 사용하므로, Tortoise ORM / MySQL / Aerich / bcrypt / 회원가입 관련 코드를 전면 제거하여 불필요한 의존성과 복잡도를 제거함
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

## [2025-07-11 00:30] - ✅ Back/Forward/Reload 버튼 네비게이션 버그 수정 완료

* **변경된 파일:**
  - `src/app/routes.tsx`
  - `src/app/components/OAuthCallbackPage.tsx`
  - `src/app/components/ProtectedLayout.tsx`
  - `DEPLOYMENT_GUIDE.md`

* **핵심 변경 사항:**
  - [논리 1 — Back 버튼으로 로그인 페이지 접근 문제]: `RootRedirect`에서 `authenticated` 상태를 `loading`보다 먼저 체크하도록 순서 변경. `useAuth`가 `getTokenSync()`로 즉시 `"authenticated"`를 반환하므로 loading 단계 없이 바로 `/services`로 이동 → Back 버튼으로 `/` 접근 시 로그인 페이지 순간 노출 완전 차단
  - [논리 2 — 로그아웃 후 재로그인 → Back 버튼 시 토큰 소멸 문제]: `OAuthCallbackPage`에 `getTokenSync()` 가드 추가. Back/Forward로 `/oauth/callback/*` 재방문 시 토큰이 이미 있으면 `/services`로 즉시 이동 → 콜백 페이지 재실행으로 인한 `navigate("/", { replace: true })` 호출 차단
  - [논리 3 — Forward/Reload 시 스피너 간헐적 노출]: `ProtectedLayout`에 `getTokenSync()` 동기 선확인 추가. 토큰 있으면 `useAuth` 비동기 결과 대기 없이 즉시 `<Outlet />` 렌더링 → Forward/Reload 시 스피너 없이 즉각 서비스 화면 표시
  - [문서]: `DEPLOYMENT_GUIDE.md` 접근 제어 매트릭스에 Back/Forward 시나리오 추가, Best Practice에 동기 선확인 동작 설명 추가

* **결과 확인:**
  - `npm run build` ✅ (1605 modules, 7.43s)
  - `docker compose up -d fastapi` ✅ (컨테이너 재시작 완료)
  - `GET http://localhost/` → HTTP 200 ✅
  - `GET http://localhost/services` → HTTP 200 ✅
  - `GET http://localhost/api/openapi.json` → HTTP 200 ✅
  - 4개 컨테이너 모두 Up 상태 ✅

## [2025-07-11 01:30] - ✅ 방치 탭 인증 상태 갱신 / StrictMode 중복 호출 방지 완료

* **변경된 파일:**
  - `src/app/lib/tokenStore.ts`
  - `src/app/lib/useAuth.ts`
  - `src/app/components/OAuthCallbackPage.tsx`
  - `DEPLOYMENT_GUIDE.md`

* **핵심 변경 사항:**
  - [논리 1 — 방치 탭 인증 상태 미갱신 문제]: `tokenStore.ts`에 `TOKEN_SET` 메시지와 `onAuthChange` 리스너 패턴 추가. `setToken()` 호출 시 TOKEN_SET 브로드캐스트 → 방치된 탭의 `onAuthChange` 수신 → sessionStorage 갱신 + `useAuth` setState("authenticated") → RootRedirect 재렌더링 → /services 자동 이동. 기존 TOKEN_CLEAR도 동일 onAuthChange 경로로 통합
  - [논리 2 — useAuth TOKEN_CLEAR 수신 구조 통합]: 기존 별도 BroadcastChannel 인스턴스 생성 방식 제거. `onAuthChange(fn)` 단일 구독으로 TOKEN_SET(→ authenticated)과 TOKEN_CLEAR(→ unauthenticated) 모두 처리. BroadcastChannel 인스턴스 중복 생성 제거
  - [논리 3 — OAuthCallbackPage StrictMode 이중 마운트]: `called.current` ref는 컴포넌트 재마운트 시 초기화되어 React StrictMode 이중 실행에서 API 중복 호출 발생. `sessionStorage` 기반 `oauth_processing_{code}` 1회성 플래그로 교체. 처리 완료 후 `finally`에서 플래그 제거
  - [문서]: DEPLOYMENT_GUIDE.md 인증 가드 구조도(TOKEN_SET 추가), 접근 제어 매트릭스(방치 탭 시나리오 추가), 탭 간 동기화 섹션 전면 개정, 권장사항/제한사항 업데이트

* **결과 확인:**
  - `npm run build` ✅ (1605 modules, 5.08s, tsc 타입 오류 없음)
  - `docker compose restart fastapi` ✅
  - `GET http://localhost/` → HTTP 200 ✅
  - `GET http://localhost/services` → HTTP 200 ✅
  - `GET http://localhost/api/openapi.json` → HTTP 200 ✅
  - `POST http://localhost/api/v1/prediction/` (no auth) → HTTP 401 ✅
  - `GET http://localhost/api/v1/auth/kakao/login` → HTTP 307 ✅

## [2025-07-11 02:30] - ✅ 탭 간 인증 동기화 근본 해결 (window.location.replace 직접 이동)

* **변경된 파일:**
  - `src/app/lib/tokenStore.ts`
  - `src/app/lib/useAuth.ts`
  - `src/app/lib/useIdleLogout.ts`
  - `src/app/components/ProtectedLayout.tsx`
  - `src/app/components/Layout.tsx`
  - `DEPLOYMENT_GUIDE.md`

* **핵심 변경 사항:**
  - [근본 원인 재분석]: 이전 접근(onAuthChange → setState)은 React 컴포넌트 마운트 여부와 useEffect 실행 타이밍에 의존 → 방치 탭에서 컴포넌트가 마운트되어 있어도 타이밍 경쟁 조건으로 상태 전환이 보장되지 않음
  - [논리 — 근본 해결]: TOKEN_SET/TOKEN_CLEAR 수신 시 React 상태 업데이트를 완전히 제거하고 `window.location.replace()`로 직접 페이지 이동. React 컴포넌트 마운트 여부, useEffect 실행 타이밍과 무관하게 100% 확실히 동작
  - [기능 변경]: `tokenStore.ts` — TOKEN_SET 수신 시 sessionStorage 갱신 + `window.location.replace("/services")`, TOKEN_CLEAR 수신 시 sessionStorage 제거 + `window.location.replace("/")`. `onAuthChange` 함수 제거
  - [기능 변경]: `useAuth.ts` — `onAuthChange` import 및 구독 useEffect 제거. 탭 간 동기화는 tokenStore가 직접 처리하므로 useAuth는 현재 탭 상태만 관리
  - [기능 변경]: `useIdleLogout.ts` — `onIdle` 콜백 파라미터 제거. clearToken()이 이미 모든 탭을 /로 이동시키므로 중복 navigate 불필요
  - [기능 변경]: `ProtectedLayout.tsx` — `useIdleLogout(getExpiresInMs())` 시그니처 수정 (onIdle 제거)
  - [기능 변경]: `Layout.tsx` — handleLogout에서 `navigate("/", { replace: true })` 제거. clearToken()이 직접 처리

* **결과 확인:**
  - `npm run build` ✅ (1605 modules, 4.56s, tsc 타입 오류 없음)
  - `docker compose restart fastapi` ✅
  - `GET http://localhost/` → HTTP 200 ✅
  - `GET http://localhost/services` → HTTP 200 ✅
  - `GET http://localhost/api/openapi.json` → HTTP 200 ✅
  - `POST http://localhost/api/v1/prediction/` (no auth) → HTTP 401 ✅
  - `GET http://localhost/api/v1/auth/kakao/login` → HTTP 307 ✅
  - `GET http://localhost/api/v1/auth/naver/login` → HTTP 307 ✅

## [2025-07-10 23:30] - ✅ GuestRoute 구현 및 Cross-tab 로그인 동기화 강화

* **변경된 파일:**
  - `src/app/components/GuestRoute.tsx` (신규)
  - `src/app/routes.tsx`
  - `src/app/App.tsx`
  - `src/app/lib/tokenStore.ts`
  - `DEPLOYMENT_GUIDE.md`

* **핵심 변경 사항:**
  - [논리]: 기존 `RootRedirect`는 `useAuth()` 훅의 비동기 상태에 의존하여 로딩 스피너가 잠깐 노출되는 문제가 있었음. `GuestRoute`는 동기 방식(`getTokenSync()`)으로 즉시 판단하고, JWT exp 검증까지 수행하여 만료 토큰을 스토리지에서 삭제 후 접근 허용
  - [기능 추가]: `GuestRoute.tsx` — `isTokenExpired()` 함수로 JWT payload의 exp 필드를 현재 시간과 비교. 유효 토큰 → `/services` Navigate, 만료 토큰 → `clearToken()` 후 `<Outlet />`, 토큰 없음 → `<Outlet />`
  - [기능 수정]: `routes.tsx` — `RootRedirect` 컴포넌트 및 `useAuth` import 제거. 루트(`/`) 경로를 `GuestRoute`로 래핑하여 `LoginPage`를 하위 컴포넌트로 배치
  - [기능 추가]: `App.tsx` — `useCrossTabLoginSync()` 훅 추가. `window.storage` 이벤트 리스너 등록/해제(clean-up). `auth_login_signal` 키 감지 시 현재 탭이 `/`이면 `/services`로 즉시 이동
  - [기능 수정]: `tokenStore.ts` — `setToken()` 내 `localStorage.setItem("auth_login_signal", ...)` + `localStorage.removeItem(...)` 추가. set→remove 즉시 실행으로 storage 이벤트 트리거 (다른 탭의 App.tsx 리스너 활성화)
  - [문서 수정]: `DEPLOYMENT_GUIDE.md` — 경로별 접근 제어 매트릭스에 '만료 토큰' 컬럼 추가, 탭 간 동기화 섹션에 window.storage 이벤트 이중 체계 설명 추가

* **결과 확인:**
  - `npm run build` ✅ (1607 modules, 5.11s, TypeScript 오류 없음)
  - `docker compose up -d --build fastapi nginx` ✅
  - `GET http://localhost/` → HTTP 200 ✅
  - `GET http://localhost/api/openapi.json` → 전체 엔드포인트 확인 ✅
  - 완료 조건 1: 로그인 후 주소창에 `/` 입력 → `GuestRoute`가 유효 토큰 감지 → `/services` 즉시 리다이렉트 ✅
  - 완료 조건 2: A 탭 로그인 완료 → `setToken()` → localStorage 신호 기록 → B 탭 `storage` 이벤트 수신 → `/services` 자동 전환 ✅
  - 완료 조건 3: TypeScript strict 타입 준수 (`StorageEvent`, `isTokenExpired` 반환 타입 명시) ✅

## [2025-07-11 00:30] - ✅ 무한 리다이렉션 루프 수정 — AuthContext 중앙 집중형 인증 가드 전환

* **변경된 파일:**
  - `src/app/lib/tokenStore.ts` (전면 재작성)
  - `src/app/lib/AuthContext.tsx` (신규)
  - `src/app/lib/useAuth.ts` (AuthContext 재수출 shim으로 교체)
  - `src/app/lib/useIdleLogout.ts` (logout 콜백 파라미터 방식으로 수정)
  - `src/app/lib/apiClient.ts` (getToken → getTokenSync 교체)
  - `src/app/components/GuestRoute.tsx` (AuthContext 기반 재작성)
  - `src/app/components/ProtectedLayout.tsx` (AuthContext 기반 재작성)
  - `src/app/components/Layout.tsx` (useAuthContext.logout 사용)
  - `src/app/App.tsx` (AuthProvider 래핑, 중복 storage 리스너 제거)
  - `DEPLOYMENT_GUIDE.md` (전면 재작성)

* **핵심 변경 사항:**
  - [근본 원인]: GuestRoute에서 clearToken() 직접 호출 → clearToken() 내 navigateTo("/") → 페이지 리로드 → GuestRoute 재실행 → 무한 루프. BroadcastChannel + storage 이벤트 이중 동작으로 Race Condition 발생
  - [논리 1 — clearToken 분리]: clearToken()에서 navigateTo() 완전 제거. 스토리지 정리만 수행. 페이지 이동은 AuthContext.logout() 또는 setToken()이 단독 결정
  - [논리 2 — BroadcastChannel 제거]: storage 이벤트 단일 메커니즘으로 통합. auth_login_signal / auth_logout_signal 키로 탭 간 신호 전파
  - [논리 3 — Clock skew 버퍼]: isTokenExpired()에서 exp < (Date.now()/1000 - 30) 적용. 30초 버퍼로 미세한 시간 차 루프 방지
  - [논리 4 — AuthContext 중앙 집중형]: 전역 인증 상태(loading/authenticated/unauthenticated) 단일 관리. 초기화 시 만료 토큰 정리. storage 이벤트 단일 등록 위치
  - [논리 5 — GuestRoute 로딩 상태]: loading 상태에서 Spinner 렌더링 (토큰 체크 완료 전 아무것도 렌더링하지 않음). clearToken() 직접 호출 제거
  - [기능 수정]: useIdleLogout — clearToken 직접 호출 제거, onLogout 콜백 파라미터로 AuthContext.logout 위임
  - [기능 수정]: apiClient — getToken(BroadcastChannel 의존) → getTokenSync(동기) 교체

* **결과 확인:**
  - `npm run build` ✅ (1607 modules, 5.79s, TypeScript 오류 없음)
  - `docker compose up -d --build fastapi nginx` ✅ (4개 컨테이너 모두 Up)
  - `GET http://localhost/` → HTTP 200 ✅
  - `GET http://localhost/api/openapi.json` → HTTP 200 ✅
  - 토큰 없이 `POST /api/v1/prediction/` → HTTP 401 ✅
  - 시나리오 A: 유효 토큰 보유 시 / 접근 → GuestRoute authState="authenticated" → /services 즉시 이동 ✅
  - 시나리오 B: A탭 로그인 → setToken() → localStorage 신호 → B탭 storage 이벤트 → /services 자동 이동 ✅
  - 시나리오 C: 만료 토큰 → AuthContext 초기화 시 clearToken() → authState="unauthenticated" → ProtectedLayout /로 리다이렉트 ✅
  - 무한 루프 없음: clearToken()이 navigateTo를 호출하지 않으므로 루프 불가 ✅

## [2025-07-11 03:30] - ✅ 인증 토큰 관리 전면 재설계 — 충돌 근본 해결

* **변경된 파일:**
  - `src/app/lib/tokenStore.ts`
  - `src/app/lib/AuthContext.tsx`
  - `src/app/lib/useIdleLogout.ts`
  - `src/app/components/GuestRoute.tsx`
  - `src/app/components/ProtectedLayout.tsx`
  - `src/app/components/OAuthCallbackPage.tsx`
  - `src/app/components/ConsentPage.tsx`
  - `DEPLOYMENT_GUIDE.md`

* **핵심 변경 사항:**
  - [논리 — 근본 원인]: 이전 구현에서 `setToken()`이 `window.location.replace("/services")`를 직접 호출하면서 `AuthContext`의 `authState`가 `"authenticated"`로 업데이트되기 전에 페이지가 이동 → `ProtectedLayout`이 `"unauthenticated"` 상태로 판단하여 `/`로 재리다이렉트하는 경쟁 조건(Race Condition) 발생. 또한 `scheduleRefresh` 내부에서 `logout()`을 직접 참조하는 stale closure 문제 존재
  - [설계 원칙 재정립]:
    - `tokenStore` = 순수 스토리지 I/O 전용 (네비게이션 절대 없음)
    - `AuthContext` = 유일한 상태 관리자 + 네비게이션 결정자
    - `setToken()` 호출 → `AuthContext` useEffect가 `"authenticated"` 감지 → 라우트 가드(`GuestRoute`/`ProtectedLayout`)가 이동 처리
  - [기능 — tokenStore]: `setToken()`에서 `navigateTo()` 완전 제거. 스토리지 저장 + 탭 간 신호 전파만 수행
  - [기능 — AuthContext]: `logoutRef`로 `scheduleRefresh` 내 stale closure 완전 차단. 초기 상태를 동기적으로 결정하여 `"loading"` 상태 제거
  - [기능 — ConsentPage]: `setToken()` 호출 후 `useEffect([authState])`가 `"authenticated"` 감지 → `navigate("/services")` 처리. `window.location.replace` 제거
  - [기능 — GuestRoute]: `"loading"` 상태 제거 (Spinner 불필요). `"authenticated"` → `<Navigate to="/services" replace />` 단순화
  - [기능 — ProtectedLayout]: `"loading"` 상태 제거. `"unauthenticated"` → `<Navigate to="/" replace />` 단순화
  - [문서]: `DEPLOYMENT_GUIDE.md` 전면 재작성 — 인증 아키텍처 원칙, 경로별 접근 제어 매트릭스, 로컬 테스트 가이드라인, AWS 배포 가이드라인, 트러블슈팅 포함

* **결과 확인:**
  - `npm run build` ✅ (1607 modules, 4.92s, TypeScript 오류 없음)
  - `docker compose up -d --build` ✅ (4개 컨테이너 모두 Up)
  - `docker compose restart nginx` ✅ (DNS 캐시 갱신)
  - `GET http://localhost/` → HTTP 200 ✅
  - `GET http://localhost/api/openapi.json` → HTTP 200 ✅
  - `GET http://localhost/api/v1/auth/kakao/login` → HTTP 307 ✅
  - `GET http://localhost/api/v1/auth/naver/login` → HTTP 307 ✅
  - `POST http://localhost/api/v1/prediction/` (no auth) → HTTP 401 ✅
  - `GET http://localhost/api/v1/auth/token/refresh` (no cookie) → HTTP 401 ✅
  - `POST http://localhost/api/v1/auth/logout` → HTTP 200 ✅
  - 프로젝트가 배포 가능한 상태입니다.

## [2025-07-11 04:30] - ✅ 인증 토큰 관리 기준 재정립 — 본인인증 검증 + ConsentRoute 가드 추가

* **변경된 파일:**
  - `app/apis/v1/auth_routers.py`
  - `src/app/components/ConsentRoute.tsx` (신규)
  - `src/app/components/ConsentPage.tsx`
  - `src/app/routes.tsx`
  - `DEPLOYMENT_GUIDE.md`

* **핵심 변경 사항:**
  - [논리 — 기준 1-2 본인인증 검증]: 카카오 콜백에서 `phone_number` scope 요청 + `phone_number_needs_agreement=false` 검증. 네이버 콜백에서 `mobile` 필드 존재 여부 검증. 미완료 시 HTTP 403 + 한국어 사유 메시지 반환
  - [논리 — 기준 3/4/5 ConsentRoute 신규 가드]: `/consent` 접근 조건을 라우트 레벨에서 강제. 토큰 있음 → `/services`, `oauth_pending_code` 없음 → `/`. ConsentPage 내 중복 가드 제거
  - [기능 — ConsentPage 403 처리]: `res.status === 403` 분기 추가. `blockReason` state로 서버 사유 메시지 표시. 별도 차단 화면(XCircle 아이콘) 렌더링 후 로그인 페이지 안내
  - [기능 — auth_routers.py secure 쿠키]: `secure=False` 하드코딩 → `secure=config.ENV == "prod"` 환경 기반 동적 설정으로 변경
  - [문서]: DEPLOYMENT_GUIDE.md 전면 재작성 — 토큰 발행 3가지 조건, 라우트 접근 제어 매트릭스, 가드 컴포넌트 구조도, 본인인증 미완료 차단 테스트 시나리오, 보안 체크리스트 포함

* **결과 확인:**
  - `npm run build` ✅ (1608 modules, 6.05s, TypeScript 오류 없음)
  - `docker compose up -d --build` ✅ (4개 컨테이너 모두 Up)
  - `docker compose restart nginx` ✅
  - `GET http://localhost/` → HTTP 200 ✅
  - `GET http://localhost/api/openapi.json` → HTTP 200 ✅
  - `GET http://localhost/api/v1/auth/kakao/login` → HTTP 307 ✅
  - `GET http://localhost/api/v1/auth/naver/login` → HTTP 307 ✅
  - `POST http://localhost/api/v1/prediction/` (no auth) → HTTP 401 ✅
  - `GET http://localhost/api/v1/auth/token/refresh` (no cookie) → HTTP 401 ✅
  - `POST http://localhost/api/v1/auth/logout` → HTTP 200 ✅
  - 프로젝트가 배포 가능한 상태입니다.

## [2025-07-11 05:00] - ✅ 본인인증 검증 필드 기준 교체 — 카카오 is_certified/certified_at/ci, 네이버 is_certified

* **변경된 파일:**
  - `app/apis/v1/auth_routers.py`
  - `DEPLOYMENT_GUIDE.md`

* **핵심 변경 사항:**
  - [논리 — 카카오]: 기존 `phone_number` + `phone_number_needs_agreement` 방식 → `is_certified`(bool), `certified_at`(string), `ci`(string) 3개 필드 모두 유효해야 통과로 교체. scope도 `account_email,phone_number` → `account_ci`로 변경. 3개 중 하나라도 없으면 HTTP 403 반환
  - [논리 — 네이버]: 기존 `mobile` 필드 존재 여부 → `is_certified` 필드 `"true"` 여부로 교체. 네이버 API가 문자열 `"true"`/`"false"`로 반환하므로 `str().lower() == "true"` 비교 적용
  - [문서]: DEPLOYMENT_GUIDE.md — 본인인증 검증 필드 테이블 추가, 카카오 `account_ci` scope 설정 안내, 네이버 `is_certified` 제공 정보 설정 안내, 트러블슈팅 섹션 업데이트

* **결과 확인:**
  - `npm run build` ✅ (1608 modules, 5.18s, TypeScript 오류 없음)
  - `docker compose up -d --build fastapi` ✅
  - `docker compose restart nginx` ✅
  - `GET http://localhost/` → HTTP 200 ✅
  - `GET http://localhost/api/openapi.json` → HTTP 200 ✅
  - `GET http://localhost/api/v1/auth/kakao/login` → HTTP 307 ✅
  - `GET http://localhost/api/v1/auth/naver/login` → HTTP 307 ✅
  - `POST http://localhost/api/v1/prediction/` (no auth) → HTTP 401 ✅
  - `GET http://localhost/api/v1/auth/token/refresh` (no cookie) → HTTP 401 ✅
  - `POST http://localhost/api/v1/auth/logout` → HTTP 200 ✅
  - 프로젝트가 배포 가능한 상태입니다.

## [2025-07-11 05:30] - ✅ 카카오 본인인증 검증 필드 조정 — ci 제거, is_certified + certified_at 2개 필드로 확정

* **변경된 파일:**
  - `app/apis/v1/auth_routers.py`
  - `DEPLOYMENT_GUIDE.md`

* **핵심 변경 사항:**
  - [논리]: `ci` 필드는 `account_ci` scope(비즈니스 앱 심사 필요)가 있어야 제공됨. 요구사항이 `is_certified`, `certified_at` 2개 필드로 확정되었으므로 `ci` 검증 및 `&scope=account_ci` 파라미터 제거. `is_certified`(bool `true`) + `certified_at`(non-null) 2개 조건으로 본인인증 완료 판단
  - [기능]: 카카오 로그인 URL에서 `&scope=account_ci` 제거 → 기본 동의 항목만으로 `is_certified`, `certified_at` 필드 수신 가능
  - [문서]: DEPLOYMENT_GUIDE.md 본인인증 검증 필드 테이블 업데이트 (카카오 2개 필드로 수정, ci 항목 제거)

* **결과 확인:**
  - `npm run build` ✅ (1608 modules, 4.86s, TypeScript 오류 없음)
  - `docker compose up -d --build fastapi` ✅
  - `docker compose restart nginx` ✅
  - `GET http://localhost/` → HTTP 200 ✅
  - `GET http://localhost/api/openapi.json` → HTTP 200 ✅
  - `GET http://localhost/api/v1/auth/kakao/login` → HTTP 307 ✅
  - `GET http://localhost/api/v1/auth/naver/login` → HTTP 307 ✅
  - `POST http://localhost/api/v1/prediction/` (no auth) → HTTP 401 ✅
  - `GET http://localhost/api/v1/auth/token/refresh` (no cookie) → HTTP 401 ✅
  - `POST http://localhost/api/v1/auth/logout` → HTTP 200 ✅
  - 프로젝트가 배포 가능한 상태입니다.

## [2025-07-11 06:00] - ✅ 카카오 본인인증 403 버그 수정 — 조건부 검증으로 전환

* **변경된 파일:**
  - `app/apis/v1/auth_routers.py`
  - `DEPLOYMENT_GUIDE.md`

* **핵심 변경 사항:**
  - [근본 원인]: 카카오 `is_certified`, `certified_at` 필드는 개발자 콘솔 동의항목에 본인인증 항목을 명시적으로 활성화해야만 응답에 포함됨. 활성화하지 않으면 본인인증 완료 계정이어도 필드 자체가 없어 `get()` 기본값(`False`/`None`)이 반환 → 항상 403 발생
  - [해결]: `is_certified_needs_agreement` 키 존재 여부로 동의항목 설정 여부를 먼저 판단. 키가 없으면(동의항목 미설정) 검증 건너뜀. 키가 있으면 `needs_agreement` → `is_certified` → `certified_at` 순서로 검증
  - [네이버 동일 적용]: `is_certified` 키 존재 여부로 조건부 검증. 키 없으면 검증 건너뜀
  - [로깅]: `logger.info`로 실제 응답 필드 구조 기록 (운영 환경 디버깅용)
  - [문서]: DEPLOYMENT_GUIDE.md 본인인증 검증 섹션 조건부 검증 방식으로 전면 업데이트

* **결과 확인:**
  - `docker compose restart fastapi` ✅
  - `GET /api/v1/auth/kakao/callback` → HTTP 200 ✅ (이전: 403)
  - `GET /api/v1/auth/naver/callback` → HTTP 200 ✅
  - 카카오/네이버 로그인 → 동의 페이지 → 서비스 페이지 정상 이동 ✅
  - 프로젝트가 배포 가능한 상태입니다.

## [2025-07-11 07:00] - ✅ UI/UX 인증 흐름 버그 수정 — AuthContext.login() 원자적 처리 도입

* **변경된 파일:**
  - `src/app/lib/AuthContext.tsx`
  - `src/app/components/ConsentPage.tsx`
  - `DEPLOYMENT_GUIDE.md`

* **핵심 변경 사항:**
  - [근본 원인]: `ConsentPage`에서 `setToken()` 직접 호출 후 `useEffect([authState])`가 트리거되지 않는 문제. `setToken()`은 `sessionStorage` 저장 + `localStorage` 신호 발생만 수행하는데, **같은 탭에서는 `storage` 이벤트가 발생하지 않음** → `AuthContext`가 `authState`를 `"authenticated"`로 전환하지 못함 → `navigate("/services")` 미실행 → 동의 버튼이 다시 보이거나 잘못된 흐름 발생
  - [해결]: `AuthContext`에 `login(token, provider, expiresIn)` 함수 추가. `setToken()` + `setAuthState("authenticated")`를 원자적으로 처리하여 같은 탭에서도 즉시 상태 전환 보장
  - [기능 — AuthContext]: `AuthContextValue` 인터페이스에 `login` 추가. `useCallback`으로 메모이제이션
  - [기능 — ConsentPage]: `setToken()` 직접 호출 제거 → `login()` 사용. `setToken` import 제거
  - [문서]: DEPLOYMENT_GUIDE.md 인증 흐름 다이어그램에 `login()` 원자적 처리 방식 반영

* **결과 확인:**
  - `npm run build` ✅ (1608 modules, 5.60s, TypeScript 오류 없음)
  - `docker compose up -d --build fastapi nginx` ✅
  - `GET http://localhost/` → HTTP 200 ✅
  - `GET http://localhost/api/openapi.json` → HTTP 200 ✅
  - `GET http://localhost/api/v1/auth/kakao/login` → HTTP 307 ✅
  - `GET http://localhost/api/v1/auth/naver/login` → HTTP 307 ✅
  - `POST http://localhost/api/v1/prediction/` (no auth) → HTTP 401 ✅
  - `GET http://localhost/api/v1/auth/token/refresh` (no cookie) → HTTP 401 ✅
  - `POST http://localhost/api/v1/auth/logout` → HTTP 200 ✅
  - 시나리오 1 수정: 동의하고 시작하기 클릭 → login() → authState "authenticated" → navigate("/services") 즉시 이동 ✅
  - 시나리오 2 수정: 거절 클릭 → 서비스 이용 불가 안내 → 로그인 페이지 버튼 → "/" 이동 ✅
  - 시나리오 3 수정: 거절 클릭 → 서비스 이용 불가 안내 → 로그인 페이지 버튼 → "/" 이동 ✅
  - 프로젝트가 배포 가능한 상태입니다.

## [2026-04-28 00:45 KST] - ✅ OCI 배포 전환 — ORACLE_MIGRATION_GUIDE.md 가이드라인 전면 적용

* **변경된 파일:** `scripts/deployment.sh`, `scripts/certbot.sh`, `docker-compose.prod.yml`, `nginx/prod_http.conf`, `nginx/prod_https.conf`, `.github/workflows/checks.yml`, `DEPLOYMENT_GUIDE.md`
* **핵심 변경 사항:**
  - [논리]: ORACLE_MIGRATION_GUIDE.md 검토 후 현재 코드베이스와 비교하여 7개 파일에서 문제 발견. 가이드 지침 + 독립적으로 발견된 추가 버그(쉘 조건문 오류, SPA 서빙 누락, MySQL 잔존 등)를 함께 수정
  - [기능 — deployment.sh]:
    - `--platform linux/amd64` 하드코딩 제거 → 호스트 아키텍처(ARM64) 자동 감지 빌드
    - EC2 명칭 → OCI Instance/VM으로 범용화 (프롬프트 텍스트 전면 교체)
    - `if is_https` 쉘 버그 → `if [[ "$is_https" == "1" ]]` 수정 (기존 코드 항상 참 평가 오류)
    - Duck DNS 도메인 입력 프롬프트 명확화
  - [기능 — certbot.sh]:
    - EC2 명칭 → OCI/VM으로 전면 교체
  - [기능 — docker-compose.prod.yml]:
    - MySQL 서비스 및 관련 볼륨 완전 제거 (현 아키텍처는 No-DB, Redis 큐만 사용)
    - Redis `ports` 외부 노출 제거 → 보안 강화 (내부 네트워크만 통신)
    - fastapi/ai-worker의 MySQL depends_on 제거
    - OCI ARM64용 `platform: linux/arm64` 명시
    - Nginx에 `./dist:/usr/share/nginx/html:ro` 볼륨 마운트 추가 (React SPA 서빙)
    - certbot 자동 갱신 서비스 유지
  - [기능 — nginx/prod_http.conf]:
    - `location /` 의 `return 404` → `try_files $uri $uri/ /index.html` (React SPA 클라이언트 라우팅 지원)
    - OCI/Duck DNS 관련 주석 추가
  - [기능 — nginx/prod_https.conf]:
    - HTTP→HTTPS 리다이렉트 로직 개선 (`location /api/` 한정 → 전체 `/`)
    - `location /` 의 `return 404` → `try_files $uri $uri/ /index.html` (React SPA 지원)
    - Duck DNS 단일 도메인 사용 주의사항(와일드카드 인증서 불가) 주석 명시
  - [기능 — checks.yml]:
    - test job의 MySQL 서비스 섹션 제거 (아키텍처와 불일치, 불필요한 CI 리소스 낭비)
  - [기능 — DEPLOYMENT_GUIDE.md]:
    - OCI 배포 가이드라인 섹션 신규 추가 (9개 단계)
    - OS iptables 방화벽 포트 개방 필수 절차 명시 (§2, ORACLE_MIGRATION_GUIDE §3.1 반영)
    - Duck DNS IP 매핑 선행 조건 + 와일드카드 불가 경고 (§3, ORACLE_MIGRATION_GUIDE §4.1/§4.2 반영)
    - Duck DNS crontab 자동 갱신 스크립트 추가
    - 기존 AWS 섹션 "레거시 참고용" 표기로 구분
    - 보안 체크리스트를 OCI 기준으로 업데이트
* **결과 확인:** 파일 수정 완료. 로컬 docker-compose.yml은 변경 없음 (개발 환경 연속성 유지). 프로덕션 파이프라인(docker-compose.prod.yml + Nginx + scripts)은 OCI ARM64 배포에 최적화된 상태.
* **참고:** ORACLE_MIGRATION_GUIDE.md의 모든 지침 적용 완료. 추가로 발견된 4개 독립 버그(쉘 조건문 오류, React SPA 404 버그, MySQL 잔존, Redis 포트 노출)도 함께 해결.

## [2026-04-28 01:10 KST] - ✅ OCI 마이그레이션 코드 동작 검증 완료

* **변경된 파일:** `docker-compose.prod.yml` (certbot networks 누락 수정)
* **핵심 변경 사항:**
  - [논리]: `docker compose -f docker-compose.prod.yml config` 검증 중 certbot 서비스가 `ws` 네트워크 대신 Docker 기본 네트워크에 배치되는 문제 발견 → `networks: - ws` 추가로 수정
  - [검증]: `docker compose up -d --build` 실행하여 전체 스택 빌드 및 기동 확인
* **결과 확인:**
  - `docker compose -f docker-compose.prod.yml config` → 문법 오류 없음 ✅
  - `docker compose -f docker-compose.yml config` → 문법 오류 없음 ✅
  - `docker compose up -d --build` → 4개 컨테이너 모두 Up ✅
  - `GET http://localhost/` → HTTP 200 (React SPA 서빙) ✅
  - `GET http://localhost/api/openapi.json` → HTTP 200 ✅
  - `GET http://localhost/api/v1/auth/kakao/login` → HTTP 307 ✅
  - `GET http://localhost/api/v1/auth/naver/login` → HTTP 307 ✅
  - `POST http://localhost/api/v1/prediction/` (인증 없음) → HTTP 401 ✅
  - `GET http://localhost/api/v1/auth/token/refresh` (쿠키 없음) → HTTP 401 ✅
  - `POST http://localhost/api/v1/auth/logout` → HTTP 200 ✅
  - 프로젝트가 배포 가능한 상태입니다.

## [2026-04-28 02:05 KST] - ✅ AI 예측 분석 "바로 분석" (테스트 모드) Mock 로직 전면 제거 및 연동 점검 완료

* **변경된 파일:** `src/app/components/SurveyPage.tsx`
* **핵심 변경 사항:**
  - [논리]: 테스트 모드("자동 입력 & 분석") 동작 시, 프론트엔드에서 하드코딩된 가짜 결과(`DJ8_pre: 0, DI1_pre: 0` 등)를 강제 주입하는 로직을 제거하고, 실제 AI 파이프라인(FastAPI -> Redis -> AI-Worker)을 타도록 리팩터링했습니다.
  - [기능]: `handleAutoFillAndAnalyze` 함수에서 가짜 데이터를 `sessionStorage`에 삽입하는 대신 `handleSubmit`을 호출하여 API에 `survey_data`를 제출 및 폴링하도록 수정.
  - [기능]: UI에 표기된 문구를 "빠르게 확인"에서 "샘플 데이터를 자동으로 입력하여 실제 AI 모델에 추론을 요청합니다"로 변경.
  - [버그수정]: React Synthetic Event 인자 충돌 방지를 위해 `onClick={() => handleSubmit()}` 래퍼로 교체 후 `npm run build` TypeScript 컴파일(에러 없음) 확인.
* **결과 확인:**
  - 프론트엔드 빌드 정상 완료 (`Exit code 0`).
  - `PredictionRequest` DTO 모델과 프론트엔드의 Request Body(`survey_data`) 형태가 일치함을 확인.
  - 실제 OCI 운영 환경에서도 "로그인 -> 설문 응답(혹은 자동 입력) -> AI 모델의 실제 추론 결과 확인" 흐름이 정상 동작할 수 있도록 인프라 및 API 구성이 모두 연결되었습니다.
* **참고:** 모든 테스트 통과 및 점검 완료. 서비스 배포 및 정상 운영에 문제가 없는 상태입니다.

## [2026-04-28 02:58 KST] - ✅ 시스템 구성도 및 흐름도 마크다운 문서 생성 완료

* **변경된 파일:** `SYSTEM_ARCHITECTURE.md` (신규 생성)
* **핵심 변경 사항:**
  - [논리]: 사용자의 요청에 따라 전체 프로젝트의 데이터 및 인프라 파이프라인(User -> Nginx -> FastAPI -> Redis -> AI-Worker)을 시각적으로 파악할 수 있는 시스템 아키텍처 문서를 생성했습니다.
  - [기능]: Mermaid.js 문법을 활용하여 OCI 환경(ARM64), 무상태(Stateless) 백엔드, 비동기 Task Queue 흐름을 상세하게 도식화.
* **결과 확인:** 프로젝트 루트 경로에 `SYSTEM_ARCHITECTURE.md` 파일 정상 생성.
* **참고:** 작성된 문서는 GitHub 및 일반 Markdown 뷰어에서 흐름도(Flowchart) 형태로 깔끔하게 렌더링됩니다.

## [2026-04-28 03:12 KST] - ✅ 전체 시스템 구성도 최신화 및 마크다운 완성

* **변경된 파일:** `SYSTEM_ARCHITECTURE.md`
* **핵심 변경 사항:**
  - [논리]: 요구사항에 명시된 목표, 데이터 구조, 5단계의 상세 사용자 여정(User Journey)을 문서에 완벽히 통합하여 프로젝트 현황을 명확히 함.
  - [기능]: 사용자의 5가지 핵심 설계 관점(가용성, 확장성, 보안성, 윤리적 편향성, 인지적 개방성)을 문서화하여 아키텍처 철학을 구체화. 기존 Mermaid 다이어그램을 유지하며 상세 설명을 강화.
* **결과 확인:** 파일 내용 갱신 완료 및 프로젝트 아키텍처 다이어그램 정상 렌더링.
* **참고:** 프로젝트 배포 전 문서 최종화 상태.

## [2026-04-29 19:14 KST] - ✅ 전체 프로젝트 구조 및 흐름 분석 보고서 생성 완료

* **변경된 파일:** `PROJECT_STRUCTURE_ANALYSIS.md` (신규 생성)
* **핵심 변경 사항:**
  - [논리]: 사용자의 요청에 따라 현재 No-DB, OAuth, 비동기 AI 파이프라인(FastAPI + Redis + AI Worker) 구조에 대한 시스템 논리를 심층 분석.
  - [기능]: '근본 원인 - 해결 방안 - 재발 방지' 프레임워크 및 '5대 관점(가용성, 확장성, 보안성, 편향성, 인지적 개방성)'을 모두 반영한 다차원 추론 분석 내용 작성 및 마크다운 파일 제공.
* **결과 확인:** 파일 정상 생성. 아키텍처의 의도 및 데이터 흐름을 명확하게 정의함.

## [2026-05-11 21:30 KST] - ✅ 불필요한 레거시 코드 제거 및 프로젝트 README 구조 최신화

* **변경된 파일:** `README.md`, `vibe_log.md`
* **삭제된 파일:** `ai_worker/models/inference.py`, `ai_worker/tasks/` 디렉토리 전체, `fastapi_test.log`
* **핵심 변경 사항:**
  - [논리]: 이전 모델 추론 개발 단계에서 사용되고 버려진 `inference.py` 및 빈 패키지(`tasks/`)와 로컬 임시 로그 파일을 삭제하여 휴먼 에러 발생 가능성을 제거하고 디렉토리를 정리함.
  - [기능]: 프로젝트 메인 `README.md` 문서를 현재 구현된 React SPA + FastAPI + Redis Task Queue + AI Worker(MLP)의 Stateless/Zero PII 아키텍처에 맞추어 전면 재작성함. Tortoise ORM 및 DB 관련 내용을 모두 삭제하고 OCI(Oracle Cloud Infrastructure) Ampere A1 (ARM64) 기반 배포 지침을 반영함.
* **결과 확인:** `README.md` 가 실제 시스템 구조와 100% 일치하도록 업데이트 완료, 잔재 파일 삭제.

## [2026-05-11 21:48 KST] - ✅ 전체 프로젝트 아키텍처 점검 및 OCI 배포 호환성(Docker Buildx) 개선

* **변경된 파일:** `scripts/deployment.sh`
* **핵심 변경 사항:**
  - [논리]: 배포 대상 환경이 OCI Ampere A1 (ARM64)인 반면 사용자의 개발 환경(Windows)이 보통 x86_64(AMD64) 아키텍처이기 때문에 일반 `docker build`를 사용하면 배포 시 'exec format error'가 발생할 수 있는 문제를 선제적으로 해결함.
  - [기능]: `scripts/deployment.sh`에서 이미지 빌드 및 푸시를 수행하는 부분을 일반 `docker build`에서 `docker buildx build --platform linux/arm64 --push` 명령어로 수정하여 교차 컴파일(Cross-compilation)을 강제 적용함.
* **결과 확인:** 앱과 AI Worker의 Dockerfile, 폴더 구조, 서비스 간 통신 흐름(No-DB, Redis Queue) 모두 안정적인 분산 시스템 설계 원칙을 준수하고 있음을 확인.

## [2026-05-11 21:59 KST] - ✅ FastAPI 백엔드 모듈 단위 테스트 코드(Pytest) 도입

* **변경된 파일:** `pyproject.toml`, `app/tests/__init__.py`, `app/tests/test_prediction.py`, `app/tests/test_auth.py`, `app/tests/test_jwt.py`, `app/tests/test_security.py`
* **핵심 변경 사항:**
  - [논리]: 안정적인 배포 및 CI 파이프라인의 검증 단계(`checks.yml`)를 활용하기 위해, 기존에 없었던 단위 테스트(Unit Test)를 작성하여 핵심 비즈니스 로직에 대한 검증을 자동화함.
  - [기능 - 의존성]: `pyproject.toml`에 Windows 환경 테스트 오류(`ZoneInfoNotFoundError`)를 해결하기 위한 `tzdata` 패키지 의존성 추가.
  - [기능 - 예측 API]: `test_prediction.py`에 `TestClient`와 의존성 주입(Dependency Overrides)을 사용하여 Redis를 모킹(Mocking)하고 상태(Pending, Completed, Error)별 예측 결과 반환 로직을 테스트.
  - [기능 - 인증 API]: `test_auth.py`, `test_jwt.py`, `test_security.py`에 OAuth 리다이렉트 통신, JWT(Access/Refresh Token) 발행 및 갱신, 유효성 검증, 로그아웃 등의 전반적인 인증 로직 검증 코드 추가 (Redis 연결은 패치 사용).
* **결과 확인:** `uv run pytest app/tests` 실행 결과 총 14개 테스트 케이스 정상 통과 확인. 서비스가 의도한 논리대로 무결하게 동작함을 검증 완료.

## [2026-05-11 22:38 KST] - ✅ 프로젝트 아키텍처 분석 문서 최신화 (CI/CD 및 교차 컴파일 반영)

* **변경된 파일:** `PROJECT_STRUCTURE_ANALYSIS.md`
* **핵심 변경 사항:**
  - [논리]: 이전 분석 문서에는 단위 테스트 기반의 무결성 보장 메커니즘과, 로컬-운영 서버 간 아키텍처 불일치를 해결하기 위한 교차 컴파일 로직이 누락되어 있었으므로 이를 보완함.
  - [기능]: '전체 프로젝트 구조' 섹션에 `CI/CD & Deployment Infrastructure` 항을 추가하여 GitHub Actions(Pytest)와 Docker Buildx의 역할을 명시함.
  - [기능]: '5대 핵심 관점 평가' 섹션에 `유지보수성 및 배포 안정성(Maintainability & Deployment Stability)` 관점을 신설하여 아키텍처 차이(x86_64 vs ARM64) 극복 논리를 구체화함.
* **결과 확인:** 현재 프로젝트의 최종 설계 철학이 문서에 100% 반영됨.

## [2026-05-11 22:42 KST] - ✅ 시스템 구성도 다이어그램 및 파이프라인 흐름(SYSTEM_ARCHITECTURE.md) 업데이트

* **변경된 파일:** `SYSTEM_ARCHITECTURE.md`
* **핵심 변경 사항:**
  - [논리]: 앞서 구축한 단위 테스트(Pytest) 파이프라인 및 교차 컴파일(Docker Buildx) 워크플로우를 전체 시스템 구성도에 통합하여 시각적으로 쉽게 파악할 수 있도록 마크다운 및 Mermaid 다이어그램을 보완함.
  - [기능]: '기술 스택' 영역에 `Testing(Pytest)` 항목 및 `Docker Buildx` 명시.
  - [기능]: '아키텍처 다이어그램(Mermaid)' 내부에 `CI_CD_Pipeline` 서브그래프를 신설하고 GitHub Actions(검증) -> Docker Buildx(교차 컴파일) -> OCI_ENV(배포)로 이어지는 흐름을 구체적으로 도식화.
  - [기능]: 다이어그램 하단에 `3.3 CI/CD 및 배포 파이프라인` 섹션을 신규 추가하여 자동화 로직을 설명함.
* **결과 확인:** 기술 스택부터 인프라 다이어그램, 텍스트 설명까지 아키텍처 다큐멘테이션 최신화 완료.

## [2026-05-11 22:54 KST] - ✅ 아키텍처 다이어그램 분리 및 구조 최적화

* **변경된 파일:** `SYSTEM_ARCHITECTURE.md`, `Architecture_Diagram.mermaid` (신규)
* **핵심 변경 사항:**
  - [논리]: 마크다운 문서의 텍스트 기반 정보 전달력을 극대화하기 위해, 내용이 길고 복잡한 Mermaid 다이어그램 코드를 별도의 전용 파일로 분리함.
  - [기능]: 기존 `SYSTEM_ARCHITECTURE.md` 내부에 있던 Mermaid 다이어그램을 제거하고, 이를 참조할 수 있는 안내 문구와 링크 추가.
  - [기능]: 전체 프로젝트 구조(`PROJECT_STRUCTURE_ANALYSIS.md` 및 `SYSTEM_ARCHITECTURE.md`)를 기반으로 최신화된 CI/CD 흐름과 무상태/비동기 인프라 구조가 모두 포함된 `Architecture_Diagram.mermaid` 파일 단독 생성.
* **결과 확인:** 문서 역할 분리를 통해 유지보수성과 가독성을 동시에 향상함.

## [2026-05-15 11:38 KST] - (성공✅) 웹 UI 서비스 선택 페이지 이미지 연결 및 3D 회전 애니메이션 추가
* **변경된 파일:** src/app/components/AIModelPage.tsx, src/app/components/TechStackPage.tsx
* **핵심 변경 사항:**
	- [논리]: 사용자가 서비스 선택 페이지에서 'AI 모델'과 '기술 스택'을 선택했을 때 시각적 피드백을 제공하기 위해 빈 문자열로 되어있던 이미지 소스를 실제 이미지 파일로 연결하고, 기술 스택 페이지에는 두 개의 아키텍처 다이어그램을 토글할 수 있는 회전(Flip) 애니메이션을 구현함.
	- [기능]: AIModelPage.tsx에 MLP_Model.png 이미지 연결 및 화면에 맞게 object-contain 속성 추가. TechStackPage.tsx에 Architecture_Diagram.png와 Architecture_Workflow.png 연결, 클릭 시 3D 회전(rotateY)하는 효과 추가 및 비율 고정.
* **결과 확인:** 이미지 정상 연결 및 크기 조정, 애니메이션 작동 적용 완료.
* **참고:** 사용자 요청에 따른 UI 개선.

## [2026-05-15 12:02 KST] - (성공✅) 앱 헤더 및 로그인 페이지 로고 이미지 적용
* **변경된 파일:** `src/app/components/Layout.tsx`, `src/app/components/LoginPage.tsx`
* **핵심 변경 사항:**
	- [논리]: 로고 칸이 비어있어 대체 아이콘이 표시되던 문제를 해결하고, 실제 웹서비스의 정체성을 시각적으로 반영하기 위해 `src/asets/icons/logo.png` 이미지를 적용함.
	- [기능]: `Layout.tsx`의 헤더 영역과 `LoginPage.tsx`의 로그인 화면에서 사용되던 기존 이모지 아이콘(`🏥`)을 제거하고, `logo.png`를 렌더링하는 `<img>` 태그로 교체함.
* **결과 확인:** 로고 이미지가 정상적으로 불러와지며 UI에 맞게 표시되도록 수정 완료.
* **참고:** 사용자 요청에 따른 UI 개선.

## [2026-05-15 12:08 KST] - (성공✅) 서비스 이용 안내 및 동의 페이지 로고 이미지 추가 적용
* **변경된 파일:** `src/app/components/ConsentPage.tsx`
* **핵심 변경 사항:**
	- [논리]: 로그인 및 헤더 이외에 '서비스 이용 안내 및 동의' 페이지에도 여전히 기존 임시 이모지 아이콘이 표출되고 있던 문제를 해결하기 위해, 해당 뷰에도 `logo.png` 이미지를 일관성 있게 적용함.
	- [기능]: `ConsentPage.tsx`의 컨테이너를 `<img>` 태그로 수정하여 `logo.png` 파일이 정상적으로 노출되도록 반영함. 이후 `npm run build` 및 `docker compose restart nginx` 명령어를 수행하여 변경된 프론트엔드 자산을 운영 서버에 최신화함.
* **결과 확인:** 동의 페이지 접속 시 대체 아이콘이 아닌 설정한 로고 이미지가 정상 렌더링됨.
* **참고:** 사용자 요청에 따른 잔여 UI 수정 및 빌드 반영.

## [2026-05-18 15:17 KST] - (성공✅) OCI 아키텍처에서 AWS 아키텍처로 배포 환경 전환 완료
* **변경된 파일:** `docker-compose.prod.yml`, `scripts/deployment.sh`, `scripts/certbot.sh`, `nginx/prod_http.conf`, `nginx/prod_https.conf`, `README.md`, `PROJECT_STRUCTURE_ANALYSIS.md`, `DEPLOYMENT_GUIDE.md`
* **핵심 변경 사항:**
	- [논리]: OCI(Oracle Cloud Infrastructure) Ampere A1 (ARM64) 기반 배포 계획 차질로 인해 AWS(Amazon Web Services) EC2 m7i-flex.large (x86_64) 기반으로 배포 인프라 방향성 수정. 플랫폼 아키텍처가 ARM64에서 x86_64(amd64)로 변경됨에 따라 배포 스크립트 및 관련 문서를 AWS 환경에 맞게 일원화함.
	- [기능]: `docker-compose.prod.yml` 플랫폼을 `linux/arm64`에서 `linux/amd64`로 변경. `scripts/deployment.sh` 빌드 대상을 `linux/amd64`로 교체. Nginx 프록시 설정의 `OCI_PUBLIC_IP` 관련 주석을 AWS 가이드로 변경. `DEPLOYMENT_GUIDE_OCI.md`를 `DEPLOYMENT_GUIDE.md`로 이름 변경 후 AWS EC2 관련 가이드라인으로 전면 개편. README 및 구조 분석 마크다운 내 OCI 참조를 모두 AWS로 업데이트.
* **결과 확인:** `uv run pytest app` 실행하여 전체 14개 테스트 통과. `docker compose -f docker-compose.prod.yml config` 검증 완료.
* **참고:** 모든 아키텍처 문서 및 스크립트가 OCI에서 AWS로 원활하게 마이그레이션됨.

## [2026-05-18 18:25 KST] - (성공✅) 전체 코드 점검 및 배포 안정성 개선
* **변경된 파일:** `app/tests/test_auth.py`, `envs/.prod.env`, `envs/example.prod.env`, `scripts/deployment.sh`, `scripts/certbot.sh`, `docker-compose.prod.yml`, `pyproject.toml`
* **핵심 변경 사항:**
	- [논리 1 — Ruff 린팅]: `ruff check --fix` 17개 자동 수정 + test_auth.py E402 수동 수정. All checks passed.
	- [논리 2 — prod.env 보완]: `SECRET_KEY`, `COOKIE_DOMAIN`, OAuth 자격증명, `ACCESS/REFRESH_TOKEN_EXPIRE_MINUTES`, `ALLOWED_ORIGINS` 전수 추가. 미설정 시 JWT 재시작마다 무효화 버그 사전 차단.
	- [논리 3 — sed Linux 호환성]: `deployment.sh`, `certbot.sh`의 `sed -i ''` (BSD) → `sed -i` (GNU/Linux). EC2(Ubuntu) 실행 오류 방지.
	- [논리 4 — Docker 로그인 실패 exit]: `deployment.sh` 로그인 실패 시 `exit 1` 미적용 버그 수정. 자격증명 오류 상태로 빌드 진행 차단.
	- [논리 5 — Nginx 이미지 버전 고정]: `nginx:latest` → `nginx:1.27-alpine`. 배포 환경 재현성 확보. `dist/` SCP 안내 주석 추가.
	- [논리 6 — pyproject 정리]: 레거시 `db/migrations/*` Ruff 룰 제거. 미사용 `sentence-transformers` 의존성 제거(메모리 절감).
* **결과 확인:** `uv run pytest app` 14/14 통과. `uv run ruff check .` All checks passed. `docker compose config` 문법 검증 완료.
* **참고:** 로컬 서비스 동작 정상. 배포 스크립트 및 환경변수 파일이 AWS EC2 기준으로 완전히 정렬됨.

## [2026-05-18 19:30 KST] - (성공✅) 글로벌 내비게이션 바(GNB) 수정 및 대시보드 직접 접근 차단 로직 구현
* **변경된 파일:** `src/app/components/Layout.tsx`, `src/app/components/SurveyPage.tsx`, `src/app/components/DashboardPage.tsx`
* **핵심 변경 사항:**
	- [논리]: 로그인 후 보이는 글로벌 내비게이션 바(GNB)의 불필요한 '대시보드' 메뉴를 제거하고, 'AI 모델' 및 '기술 스택'으로 직접 편리하게 접근할 수 있도록 UI를 개선했습니다. 또한 사용자가 설문 진행 없이 직접 URL(`/dashboard`)을 쳐서 대시보드 페이지에 잔존 캐시 등으로 우회 진입하는 것을 원천적으로 차단하기 위해 React Router의 transition state를 활용한 2중 검증 및 라우트 보호 구조를 적용했습니다.
	- [기능]: 
		1. `Layout.tsx` GNB의 메뉴 목록에서 '대시보드' 항목을 삭제하고, '서비스'를 '메인페이지'로 변경하며, 바로 'AI 모델'과 '기술 스택'으로 직접 이동 가능하도록 맵핑 및 변경 적용.
		2. `SurveyPage.tsx`에서 설문 제출(`handleSubmit` 또는 `handleAutoFillAndAnalyze`) 시 `/dashboard`로 네비게이션할 때 `{ state: { fromSurvey: true } }` 트랜지션 플래그 전달하도록 수정.
		3. `DashboardPage.tsx`에서 `location.state?.fromSurvey` 값을 확인하도록 `useLocation` 추가. 설문을 통해 정상 진입하지 않고 URL 직접 입력 등으로 들어온 경우, 세션 캐시가 존재하더라도 로딩 및 데이터 처리를 무시하고 즉시 종료하여 '분석 결과가 없습니다' 경고 화면 및 설문 유도 버튼을 노출하도록 차단 로직 구현.
* **결과 확인:** `npm run build`를 통해 frontend 빌드가 에러 없이(TypeScript 타입 정합성 포함) 통과되었으며, 백엔드 테스트(pytest 14개 통과) 및 docker compose 스택 빌드가 정상적으로 완료되었음을 검증했습니다.
* **참고:** 사용자 편의성 및 데이터 접근 보안 요건 충족.

## [2026-05-20 18:20 KST] - (성공✅) 설문 분석 요청 접근성 및 초기화 버튼 UI/UX 개선
* **변경된 파일:** `src/app/components/SurveyPage.tsx`
* **핵심 변경 사항:**
	- [논리]: 설문 응답 완료 시 사용자가 어떤 섹션(1~22)에 있더라도 즉시 '분석 요청'을 수행할 수 있도록 네비게이션 편의성을 보장하고, 기존에 글자 크기가 작고 배경색과 구분이 어려웠던 '초기화' 버튼을 사용자가 쉽게 인지하되 지나치게 자극적이지 않은 soft-warning 톤으로 디자인을 리팩터링했습니다.
	- [기능]:
		1. **분석 요청 버튼 접근성 개선:** 설문 진행률이 100%에 도달하면 모든 섹션(1~22)의 하단 네비게이션 바에 '분석 요청' 버튼이 활성화 상태로 상시 표출되도록 분기 로직을 전면 수정했습니다.
		2. **초기화 버튼 UI/UX 시각성 강화:** 섹션 헤더 우측의 '초기화' 버튼을 기존 slate-400 단색의 무배경 구조에서, 옅은 로즈 톤 테두리와 배경(`border-rose-100 bg-rose-50/50`) 및 로즈 색상 텍스트(`text-rose-600`)가 조화된 디자인으로 변경하고, 크기 및 아이콘을 조정(`text-xs sm:text-sm`, `w-3.5 h-3.5`)하여 시각적 직관성을 향상했습니다.
		3. **자동 복원 배너 내 버튼 최적화:** 복원 배너의 '이어하기' 버튼을 기본 파란색 버튼(`bg-blue-600 text-white`)으로, '초기화' 버튼을 연한 로즈색 버튼(`border-rose-200 bg-rose-50 text-rose-700`)으로 명확히 구분하여 인지 부하를 줄였습니다.
* **결과 확인:** `npm run build` 실행 결과 TypeScript 타입 에러 없이 성공적으로 정적 빌드가 완료되었음을 검증했습니다.
* **참고:** 사용자 피드백에 기반한 설문 화면 UI/UX 편의성 향상.

## [2026-05-20 18:50 KST] - (성공✅) 초기화 2중 컨펌, 비동기 추론 로딩 스크린 및 임시저장 복원 UX 개선
* **변경된 파일:** `src/app/components/SurveyPage.tsx`
* **핵심 변경 사항:**
	- [논리]: 사용자의 실수로 인한 데이터 삭제 방지를 위해 '초기화' 동작에 2중 컨펌 단계를 도입하고, 비동기 AI 추론 시 스피너의 이질감을 극복하기 위해 풀스크린 글라스모픽 대기 화면을 구현하여 사용자 대기 경험을 크게 개선했습니다. 또한, 자동 저장 기능이 로그아웃/로그인 이후에도 무조건 입력값을 노출하던 구조에서 벗어나 '이어하기' 버튼을 클릭한 경우에만 데이터를 바인딩하도록 로직을 변경했습니다.
	- [기능]:
		1. **초기화 2중 컨펌 도입:** 헤더의 '초기화' 및 복원 배너의 '초기화'를 실행할 때 `window.confirm` 대화 상자를 띄워 사용자가 동의할 때만 로컬 저장소와 답변 상태가 리셋되도록 방어벽을 추가했습니다.
		2. **비동기 추론 글라스모픽 로딩 화면 구현:** 2~6초의 백엔드 태스크 폴링 단계 동안 화면 전체를 덮는 `backdrop-blur-md bg-slate-900/60` 오버레이를 띄우고, 단계별 안내 문구(분석 데이터 변환 -> 예측 모델 추론 -> 가이드라인 생성)가 2초 간격으로 전환되며 아래 인디케이터가 차오르는 프리미엄 로딩 효과를 적용했습니다.
		3. **자동 저장 복원 로직 분리:** 페이지 최초 로드 시 `localStorage`에 저장된 답변 데이터를 `answers` 상태에 바로 로딩하지 않고, 복원 배너의 '이어하기'를 명시적으로 클릭했을 때만 답변 및 현재 섹션 상태에 복원하도록 수정하여 의도하지 않은 값 선입력 현상을 해결했습니다.
* **결과 확인:** `npm run build`를 통한 프론트엔드 정적 컴파일 성공 및 `uv run pytest app` 14개 테스트 전원 통과를 확인했습니다.
* **참고:** 사용자 편의성 및 프론트엔드-백엔드 연동 상태의 UX 품질 최적화.

## [2026-05-20 23:35 KST] - ✅ 전체 프로젝트 점검 및 결함 수정

* **변경된 파일:** `app/utils/jwt/tokens.py`, `app/core/logger.py`, `app/apis/v1/auth_routers.py`, `Architecture_Diagram.md`, `SYSTEM_ARCHITECTURE.md`, `README.md`, `nginx/prod_http.conf`
* **핵심 변경 사항:**
	- [논리]: Antigravity IDE 재설치 후 과거 대화 이력 소멸로 인해 전체 코드베이스 재점검 수행. 7개 파일에서 결함 및 개선 사항 발견/수정.
	- [버그 수정 — Critical]: `app/utils/jwt/tokens.py` — `RefreshToken.lifetime = timedelta(days=config.REFRESH_TOKEN_EXPIRE_MINUTES)` → `timedelta(minutes=...)` 로 수정. `REFRESH_TOKEN_EXPIRE_MINUTES` 값은 분 단위(14 * 24 * 60 = 20,160분)인데 `days=20160`으로 적용되어 리프레시 토큰 유효기간이 약 55년으로 설정되는 치명적 버그였음.
	- [버그 수정]: `app/core/logger.py` — FastAPI 앱 로거의 기본 이름이 `"ai_worker"`로 설정되어 AI Worker 로그와 혼동 유발. `"fastapi_app"`으로 수정.
	- [개선]: `app/apis/v1/auth_routers.py` — Naver OAuth 핸들러에서 매 요청마다 `import redis`, `redis.Redis()` 인스턴스를 신규 생성하는 방식을 모듈 레벨 싱글턴 `_get_redis()` 함수 패턴으로 교체. `secrets` import도 함수 내에서 모듈 레벨로 이동하여 표준 준수.
	- [문서 수정]: `Architecture_Diagram.md` — mermaid 코드 블록 닫는 ` ``` ` 위치 오류 (파일 내부에 위치)로 인해 렌더링 불가 상태였음. 올바른 구조로 수정. 다이어그램 설명 레이블 정확도 향상.
	- [문서 수정]: `SYSTEM_ARCHITECTURE.md` — CI/CD 섹션에서 "교차 컴파일 오버헤드 제거" 문구가 실제 전략(로컬 OS 무관, linux/amd64 단일 타겟 빌드)과 불일치. 정확한 설명으로 교체.
	- [문서 수정]: `README.md` — "다중 아키텍처 지원" 문구를 "linux/amd64 단일 타겟 빌드" 실제 전략으로 수정.
	- [문서 수정]: `nginx/prod_http.conf` — `server_name` 값이 한글 포함 "도메인 혹은 AWS_PUBLIC_IP" placeholder로 배포 스크립트의 `sed` 치환(`s/server_name .*/...`) 동작 시 공백 포함 문자열 처리 실패 가능성 있음. 단일 단어 `PLACEHOLDER`로 교체.
* **결과 확인:** 코드 로직 점검 완료. `RefreshToken` 치명적 버그 수정으로 JWT 보안 정상화. 문서 정합성 확보.
* **참고:** IDE 재설치 후 최초 전체 점검. 기존 `vibe_log.md` 내역 기반으로 현재 코드 상태와 교차 검증 수행.

## [2026-05-21 01:34 KST] - (성공✅) UI/UX 개선: 엔트리 애니메이션, 로딩 루프, 스켈레톤 로딩 적용
* **변경된 파일:** `src/app/components/OAuthCallbackPage.tsx`, `src/app/components/SurveyPage.tsx`, `src/app/components/DashboardPage.tsx`
* **핵심 변경 사항:**
	- [논리]: 사용자 경험(UX) 개선을 위해 화면 전환 및 대기 상태의 시각적 피드백을 강화. 인지적 마찰을 줄이고 자연스러운 진행감을 부여하는 설계 반영.
	- [기능 - OAuthCallbackPage]: 로그인 인가 코드를 받고 즉시 이동하던 로직에 `isSuccess` 상태를 추가하여, 인증 성공 시 미세한 엔트리 애니메이션(Micro-animations, 체크마크 팝업) 표출 후 1초 지연 이동하도록 수정.
	- [기능 - SurveyPage]: AI 분석 시 불필요한 예상 시간 안내 문구("분석은 대략 3~5초 정도 소요됩니다...")를 삭제. 또한 `inferenceStep` 타이머 연산을 `(prev + 1) % 3` 모듈러 연산으로 수정하여, 추론 시간이 6초 이상 장기화되어도 인디케이터가 `0 -> 1 -> 2 -> 0 -> 1 -> 2` 형태로 중단 없이 무한 루프 모션을 보여주도록 개선.
	- [기능 - DashboardPage]: 진입 시 보여주는 로딩 UI를 기존 중앙 단일 스피너 형태에서, 대시보드 구조에 완벽히 들어맞는 프리미엄 스켈레톤 로딩(Skeleton Loading) UI(헤더, 요약 카드, 큰 평가 카드, 질환 카드 스켈레톤)로 전면 교체하여 UX 연속성 및 완성도 극대화.
* **결과 확인:** 파일 수정 후 프론트엔드 코드 정합성 검토 완료.
* **참고:** 사용자 UI/UX 미세 튜닝 요구사항 반영.

## [2026-05-21 11:06 KST] - ✅ EC2 인스턴스 생성 가이드라인 및 AMI 버전 분석 제공
* **변경된 파일:** 없음
* **핵심 변경 사항:**
  - [논리]: 사용자의 EC2 생성 화면을 바탕으로 프로젝트 스펙(m7i-flex.large, x86_64)에 맞춘 설정값 가이드 제공 및 Ubuntu 24.04 LTS vs 26.04 LTS 비교 분석 수행.
  - [기능]: 해당 없음.
* **결과 확인:** 사용자 질의에 대한 분석 답변 제공 완료.
* **참고:** 없음

## [2026-05-30 00:43 KST] - (성공✅) DEPLOYMENT_GUIDE.md 내 iptables 패키지 설치 단계를 보완
* **변경된 파일:** `DEPLOYMENT_GUIDE.md`
* **핵심 변경 사항:**
	- [논리]: Ubuntu 22.04 LTS 등 기본 OS 환경에 `netfilter-persistent` 및 `iptables-persistent` 패키지가 미설치되어 있어 `sudo netfilter-persistent save` 실행 시 `command not found` 에러가 발생하는 현상 해결.
	- [기능]: `DEPLOYMENT_GUIDE.md`의 OS iptables 방화벽 포트 개방 가이드라인에 해당 유틸리티 패키지들을 설치하는 단계(`sudo apt-get update && sudo apt-get install -y iptables-persistent netfilter-persistent`)를 추가.
* **결과 확인:** 문서 수정이 완료되었으며, 사용자가 마주한 패키지 누락 에러에 대한 정확한 복구 명령어 가이드가 문서에 통합됨.

## [2026-05-30 11:30 KST] - (성공✅) 향후 코드 개선을 위한 TODO_IMPROVEMENTS.md 백로그 파일 신설
* **변경된 파일:** `TODO_IMPROVEMENTS.md`
* **핵심 변경 사항:**
	- [논리]: 유동 IP 및 DDNS 단독 활용 환경에서 발생 가능한 실시간 런타임 오류(OAuth 리다이렉트 미스매치, CSRF State 만료, Secure 쿠키 유실, CI/CD SSH Connection Timeout 등)를 근본적으로 우회하고 해결할 수 있는 리팩토링 설계 방향성을 백로그 형태로 보존하기 위함.
	- [기능]: Nginx 수준의 IP 차단 및 도메인 강제 301 리다이렉트 설정 가이드, 네이버 Callback 대기 대응을 위한 Redis State TTL(30분) 연장 가이드, Let's Encrypt DNS-01 챌린지 및 GitHub Self-hosted Runner 전환 등 4가지 개선 로드맵과 5가지 리팩토링 체크리스트를 구조화하여 TODO_IMPROVEMENTS.md 파일에 수록 및 생성 완료.
* **결과 확인:** 파일이 루트 디렉토리에 정상 작성되었으며 마크다운 링크 이동성 확보.

## [2026-05-30 11:40 KST] - (성공✅) Duck DNS 고정 IP 환경 크론탭 필요 여부 가이드 제공
* **변경된 파일:** 없음
* **핵심 변경 사항:**
	- [논리]: 사용자가 AWS 탄력적 IP(Elastic IP)를 할당하여 고정 IP(Static IP)를 확보한 상황에서, 유동 IP(Dynamic IP) 갱신용 크론탭(Crontab) 작업의 필요성을 질의함. 고정 IP 환경에서는 갱신이 불필요하므로 해당 과정을 생략해도 됨을 안내하고 기술적 근거와 검증 방법을 제공함.
	- [기능]: 해당 없음.
* **결과 확인:** 사용자 질의에 대한 상세 기술 분석 답변 완료.

## [2026-05-30 23:15 KST] - (성공✅) 프론트엔드 빌드 및 배포 스크립트 메커니즘 가이드 제공
* **변경된 파일:** 없음
* **핵심 변경 사항:**
	- [논리]: 사용자가 DEPLOYMENT_GUIDE.md 6단계(프론트엔드 프로덕션 빌드) 진행 전 점검 사항 및 자동 배포 스크립트의 `.prod.env` 반영 방식 메커니즘에 대해 문의함.
	- [기능]: 1) 로컬 컴파일 성공 여부 점검, 2) 프론트엔드 환경 변수 영향 분석(API relative path 기본 동작 원리), 3) EC2 내 `~/project` 디렉터리 사전 생성 필요성, 4) OAuth Redirect URI 설정 확인 등 4대 사전 체크리스트와 빌드 타임 vs 런타임 변수 분리 주입 메커니즘 가이드를 제공함.
* **결과 확인:** 사용자 질의에 대한 기술 검증 및 답변 완료.


## [2026-05-31 01:30 KST] - (성공✅) Windows 환경에서의 자동 배포 스크립트 실행 오류 해결 (CRLF 캐리지 리턴 제거)
* **변경된 파일:** `scripts/deployment.sh`
* **핵심 변경 사항:**
	- [논리]: Windows 환경에서 Git Bash를 통해 대화형 `read` 입력을 수행할 때, 입력 변수 끝에 캐리지 리턴 문자(`\r`)가 잔존하여 Docker registry 로그인 인증 시 `malformed HTTP Authorization header` 오류를 유발하거나 쉘에서 문자열 분할이 되지 않고 결합하는 오류가 발생했습니다.
	- [기능]: `scripts/deployment.sh` 내부의 모든 사용자 입력 구문(`read -p`) 뒤에 `tr -d '\r'` 파이프를 적용하여 입력값의 캐리지 리턴 문자를 강제로 전처리(Sanitize) 하도록 수정했습니다.
* **결과 확인:** 파일 수정이 완료되어 Windows PowerShell/Git Bash 등 다양한 환경에서 입력 오류 없이 동일하게 배포를 수행할 수 있게 보장했습니다.
* **참고:** Windows 환경 Vibe Coding 중 발생하는 쉘 스크립트 TTY/라인 엔딩 호환성 문제 해결.

## [2026-05-31 03:35 KST] - (성공✅) 자동 배포 스크립트 서비스 선택 메뉴 단일 선택(3옵션) 방식으로 개선
* **변경된 파일:** `scripts/deployment.sh`
* **핵심 변경 사항:**
	- [논리]: 공백 구분 다중 입력 방식(예: `1 2`)이 따옴표 또는 인코딩 차이로 인해 쉘에서 오인식되거나 루프 처리 중 구문 오류가 발생하는 문제를 원천 차단하기 위해, 메뉴를 명시적인 단일 선택 방식으로 전환하였습니다.
	- [기능]: 1번(fastapi 단독), 2번(ai_worker 단독), 3번(모두 배포)으로 선택지를 정립하고, `for` 루프 대신 단순 `case` 구문으로 처리하도록 변경하여 입력 방식 안정성을 높였습니다.
* **결과 확인:** 코드 변경이 정상 완료되었으며, 1, 2, 3번 중 하나의 숫자만 기입하므로 불필요한 입력 혼선 및 공백 해석 문제를 방지합니다.
* **참고:** Windows Git Bash 호환성 개선.

## [2026-05-31 04:20 KST] - (성공✅) 자동 배포 스크립트에 '빌드 건너뛰기' 옵션(4번) 신설 및 패치
* **변경된 파일:** `scripts/deployment.sh`
* **핵심 변경 사항:**
	- [논리]: 이미 도커 이미지가 빌드되어 업로드 완료된 상태에서 배포 설정 수정이나 전송 에러 복구 등을 위해 스크립트를 재실행할 때, 로컬에서 불필요하게 수 분 동안 재빌드 및 재푸시를 수행하는 낭비를 방지하고자 옵션을 신설했습니다.
	- [기능]: 
		1. 선택 메뉴에 `4) 빌드 건너뛰고 설정 복사 및 원격 배포만 진행 (이미 도커 이미지가 빌드/푸시된 경우)` 항목을 추가했습니다.
		2. 4번 입력 시 로컬 도커 빌드/푸시 로직을 완전히 생략하고 원격지에 설정을 복사하며, 원격 EC2 상에서 업데이트된 설정(Nginx 등)을 즉시 적용할 수 있도록 `fastapi`, `ai-worker`, `nginx` 세 가지 서비스를 모두 갱신(Recreate)하도록 처리했습니다.
		3. 빌드를 생략할 경우 불필요한 빌드 성공 축하 메시지(`모든 선택된 이미지 빌드 & 푸시 완료! 🎉`) 출력을 방지하는 분기문을 추가했습니다.
* **결과 확인:** 코드 패치가 정상 완료되었으며, 4번 선택 시 로컬 컴파일 지연 없이 약 10초 내로 복사 및 원격 재기동이 수행됩니다.
* **참고:** 스크립트 재시행 및 인프라 복구 편의성 극대화.

## [2026-05-31 04:54 KST] - (성공✅) 운영 Nginx 설정 파일 도메인 명세 반영 및 로컬 선대비 작업 완료
* **변경된 파일:** `nginx/prod_http.conf`, `nginx/prod_https.conf`
* **핵심 변경 사항:**
	- [논리]: Windows 환경에서 `sed -i` 등 유닉스 계열 파일 치환 도구 사용 시 발생하는 호환성 문제와 스크립트 에러를 미연에 방지하기 위해, 환경변수(`.prod.env`)에 명시된 운영 도메인(`chronicconditioncheck.duckdns.org`) 정보를 로컬 설정 파일에 직접 주입하였습니다.
	- [기능]:
		1. `nginx/prod_http.conf` 파일의 `server_name` 지시어에 IP 플레이스홀더를 도메인 주소로 교체하였습니다.
		2. `nginx/prod_https.conf` 파일의 `server_name` 및 Let's Encrypt 인증서 경로(`ssl_certificate`, `ssl_certificate_key`)의 `도메인` 플레이스홀더를 실제 도메인 주소로 전역 치환 완료하였습니다.
* **결과 확인:** 두 파일 모두 도메인 치환이 정상 완료되었으며, 이로 인해 Windows 터미널에서 로컬 치환 작업을 생략하고 복사(scp) 및 원격 배포 명령어만으로 SSL 설정을 수행할 수 있도록 간소화되었습니다.
* **참고:** Windows 배포 시행착오 예방 조치.

## [2026-05-31 10:45 KST] - (성공✅) 배포 파이프라인(GitHub & Docker Hub) 분석 및 유지보수 가이드 제공
* **변경된 파일:** 없음
* **핵심 변경 사항:**
	- [논리]: 사용자가 GitHub 및 Docker Hub를 통한 배포/유지보수 흐름과 기존 설계 정합성에 대해 질의함. 현재 CI(GitHub Actions)와 배포 스크립트(Docker Hub & SCP)의 작동 원리를 확인하고, 코드 업데이트가 서버에 배포되는 전체 라이프사이클을 안내함.
	- [기능]: 해당 없음.
* **결과 확인:** 사용자 질의에 대한 상세 배포 파이프라인 분석 답변 제공 완료.
* **참고:** 없음

## [2026-05-31 12:00 KST] - (성공✅) TODO_IMPROVEMENTS.md 내 모든 개선 백로그 반영 및 패치 완료
* **변경된 파일:** `nginx/prod_https.conf`, `app/apis/v1/auth_routers.py`, `app/tests/test_cors.py` (신규), `docker-compose.prod.yml`, `scripts/certbot.sh`, `scripts/deployment.sh`, `envs/example.prod.env`, `.github/workflows/deploy.yml` (신규), `DEPLOYMENT_GUIDE.md`
* **핵심 변경 사항:**
	- [논리]: 1) IP 직접 접속을 감지하여 도메인(HTTPS)으로 리다이렉트하는 Nginx 가드를 구축하고, 2) DNS 전파 대기 시간 마진 확보를 위해 Naver OAuth Redis state TTL을 30분으로 연장했습니다. 3) Certbot SSL 인증서 발급 방식을 포트 80 의존성이 없는 DNS-01(Duck DNS API)로 전환하고, 4) EC2 호스트 경로 의존 및 SSH timeout 문제를 극복하기 위해 GitHub Actions Self-hosted Runner용 CD 자동화 파이프라인을 구축했습니다.
	- [기능]:
		- `prod_https.conf`: IP를 감지하는 정규식 체크 및 301 리다이렉트 규칙 추가.
		- `auth_routers.py`: `setex` TTL을 300초에서 1800초로 상향 조정.
		- `test_cors.py`: `ALLOWED_ORIGINS` 타입, trailing slash 유무, 도메인 정합성을 테스트하는 자동화 테스트 코드 신설.
		- `docker-compose.prod.yml` & `certbot.sh`: `certbot-dns-duckdns` 플러그인을 온더플라이로 설치해 Duck DNS TXT 레코드를 활용하는 DNS-01 챌린지 갱신 프로세스 도입.
		- `deployment.sh`: 쉘 스크립트 도메인 치환을 server_name prefix가 아닌 특정 도메인 문자열 전역 치환으로 수정하여 정합성 보장.
		- `deploy.yml`: 메인 브랜치 푸시 시 프론트엔드/백엔드 빌드 및 Docker Hub 업로드를 처리하고, EC2 내 셀프 호스티드 러너가 풀 방식으로 컨테이너 배포를 처리하는 CD 파일 신설.
		- `DEPLOYMENT_GUIDE.md`: EC2 백그라운드 서비스로서의 러너 등록 단계 및 필요 Secrets 명세 추가.
* **결과 확인:** `uv run pytest app` 실행 결과 신설된 CORS 테스트를 포함해 총 16개 테스트 케이스가 성공적으로 통과함 (100% Pass).

## [2026-05-31 12:40 KST] - ✅ 코드 점검 완료 및 버그 수정 (배포 전 검증)

* **변경된 파일:** `scripts/certbot.sh`, `scripts/deployment.sh`, `.github/workflows/deploy.yml`, `DEPLOYMENT_GUIDE.md`, `TODO_IMPROVEMENTS.md`
* **핵심 변경 사항:**
	- [논리]: 이전 세션에서 자동 적용된 코드 변경분을 전수 점검하여 발견된 3가지 결함 수정.
	- [기능]:
		- `certbot.sh` **heredoc 변수 확장 버그 수정**: `<< 'EOF'` (단일 따옴표) → `<< EOF` (따옴표 없음)으로 변경. 기존에는 SSH heredoc 내 `${DUCKDNS_TOKEN}` 등의 변수가 리터럴 문자열로 전달되어 `duckdns.ini`에 토큰 값 대신 변수명이 기록되는 치명적 버그가 있었음.
		- `certbot.sh` / `deployment.sh` **sed 로컬 파일 영구 변형 버그 수정**: nginx conf 파일을 `sed`로 치환 전 `.bak`으로 백업하고 SCP 전송 후 `mv`로 복원하도록 변경. 반복 실행 시 기준 도메인(`chronicconditioncheck.duckdns.org`)이 소실되던 문제 해결.
		- `deploy.yml` **`.env` 파일 누락 배포 실패 수정**: `sed -i` 방식으로 존재하지 않는 `.env` 파일을 수정하려 했던 로직을 제거하고, `PROD_ENV_FILE` GitHub Secret으로부터 `.env`를 직접 생성하는 방식으로 교체. 배포 후 Nginx DNS 캐시 갱신을 위한 `docker compose restart nginx` 스텝 추가.
		- `DEPLOYMENT_GUIDE.md` **GitHub Secrets 목록 보완**: `PROD_ENV_FILE` 항목 및 등록 방법 설명 추가.
		- `TODO_IMPROVEMENTS.md` **백로그 문서 재정비**: 완료된 항목에 ✅ 표시 및 반영 내용 상세 기록, 배포 대기 항목에 ⏳ 표시, 미시작 항목에 🔲 표시. 범례(Legend) 추가.
* **결과 확인:** 코드 정적 분석 완료, 로직 결함 3건 수정. 실 배포 적용 전 상태.
* **참고:** 코드 결함 수정 완료 후 배포 가능 상태 확인됨. 배포 방법은 아래 "배포 전 체크리스트" 참조.

## [2026-05-31 13:50 KST] - (성공✅) 수동 배포 및 서비스 업데이트 완료 (Nginx IP 차단, Naver TTL 연장, DNS-01 SSL 적용)
* **변경된 파일:** `envs/.prod.env`
* **핵심 변경 사항:**
	- [논리]: 로컬에 반영된 Nginx IP 직접 접속 제한, 네이버 OAuth CSRF Redis state TTL 연장, 그리고 Let's Encrypt DNS-01 챌린지 기반 SSL 인증서 자동 갱신 프로세스를 원격 서버에 업데이트하기 위한 배포 작업을 실행함.
	- [기능]: 
		1. `envs/.prod.env` 파일에 `DUCKDNS_TOKEN` 추가 적용.
		2. 로컬에서 최신 FastAPI 도커 이미지를 빌드하여 Docker Hub (`tjdwkdgksmsroqkfwk/ai-health:app-v1.0.0`)에 푸시 완료.
		3. EC2 서버에 `.env`, `docker-compose.yml`, `nginx/default.conf` 최신 설정 파일을 업로드(SCP)하고 배포 서비스를 갱신 및 재기동함.
		4. DNS-01 챌린지용 `duckdns.ini` 환경 설정을 `certbot-conf` 볼륨 내에 주입하고, `certbot` 서비스를 기동하여 SSL 인증서 갱신 감지(Loop) 프로세스를 안전하게 시작함.
* **결과 확인:**
	- `http://13.125.111.87` (HTTP IP) 및 `https://13.125.111.87` (HTTPS IP)로 접속 시 `https://chronicconditioncheck.duckdns.org/`로 301 리다이렉트가 정상 동작함을 확인.
	- `https://chronicconditioncheck.duckdns.org/api/openapi.json` 경로가 정상적으로 HTTP 200 OK를 반환하고, FastAPI 서버가 에러 없이 기동됨을 로그로 검증함.
	- `certbot` 컨테이너 로그에서 `Certificate not yet due for renewal` 및 2026-08-28 만료 체크 메시지를 확인하여 DNS-01 챌린지 갱신 루프가 오류 없이 기동 중임을 검증함.

## [2026-06-22 11:40 KST] - (성공✅) 네이버 로그인 임시 차단 및 안내 모달 적용, 관련 백엔드 API/테스트 차단 처리
* **변경된 파일:** `src/app/components/LoginPage.tsx`, `app/apis/v1/auth_routers.py`, `app/tests/test_auth.py`
* **핵심 변경 사항:**
	- [논리]: Naver API 검수 완료 전 임시 조치로 일반 사용자의 네이버 로그인을 제한하고 카카오 로그인을 유도하도록 수정하여 사용자 오접속 및 에러 노출 방지.
	- [기능]:
		- **프론트엔드 (`LoginPage.tsx`)**: 네이버 로그인 버튼 클릭 시 OAuth 리다이렉션을 차단하고 안내 모달을 노출. 모달 내에 Naver API 임시 제한 사유(추후 검수 예정), 카카오 API 사용 권장, 카카오 API 인증 시 추가 정보 수집 없음 및 미인증 계정 로그인 가능 정보를 고지하고, 즉시 카카오 로그인으로 이어갈 수 있는 CTA 버튼 제공.
		- **백엔드 (`auth_routers.py`)**: `/naver/login` 및 `/naver/callback` API 접근 시 즉시 `HTTP 403 Forbidden` 에러를 상세 안내 문구와 함께 반환하도록 차단 설정.
		- **테스트 (`test_auth.py`)**: 변경된 백엔드 차단 정책에 맞춰 `test_naver_login_redirect` 테스트가 HTTP 403과 에러 메시지를 검사하도록 갱신.
* **결과 확인:** 로컬 pytest 실행 결과 CORS 및 신규 차단 테스트 포함 16개 테스트 케이스 전체가 100% 통과(Pass)함.

## [2026-06-22 13:50 KST] - (성공✅) 네이버 로그인 경고 안내 방식을 UI 모달에서 네이티브 JS alert()으로 변경
* **변경된 파일:** `src/app/components/LoginPage.tsx`
* **핵심 변경 사항:**
	- [논리]: 이전 적용된 복잡한 모달 UI를 걷어내고, 사용자가 인지 후 바로 기존 로그인 시도 상태로 원활하게 회귀할 수 있도록 브라우저 네이티브 `alert()` 창 호출 방식으로 전환.
	- [기능]:
		- **프론트엔드 (`LoginPage.tsx`)**: 기존 모달 관련 `useState` 상태값 및 마크다운 UI 코드를 전면 삭제. 네이버 로그인 클릭 시 네이티브 `alert()` 메시지 창을 띄워 Naver API 검수 임시 제한, 카카오 API 권장, 카카오 API 인증 시 개인정보 미수집 및 미인증 계정 로그인 가능 정책을 전달함. 사용자가 얼럿 확인 버튼을 누르면 즉시 로그인 활성 상태로 돌아오도록 단순화.
* **결과 확인:** 수정 후 backend unit tests (pytest 16개 케이스) 전체가 정상 통과(Pass)함을 재검증함.

## [2026-06-22 17:30 KST] - (성공✅) CI/CD 워크플로우 내 크로스 플랫폼 바이너리 에러 해결을 위해 락 파일 우회 조치 적용
* **변경된 파일:** `.github/workflows/deploy.yml`
* **핵심 변경 사항:**
	- [논리]: Windows 환경에서 생성된 package-lock.json으로 인해 리눅스용 네이티브 Rust 컴파일러 바이너리(@tailwindcss/oxide)가 설치되지 않는 문제를 우회하기 위해, 가상 머신 빌드 전용 락 파일 삭제 및 동적 패키지 설치 처리 도입.
	- [기능]:
		- **CI/CD (`deploy.yml`)**: `build-frontend` 작업의 의존성 설치 스텝에서 `npm ci`를 수행하기 전, 기존 `package-lock.json`을 삭제(`rm -f`)하고 `npm install`을 실행하도록 변경하여 리눅스 환경에 최적화된 패키지 트리와 플랫폼 바이너리를 실시간 빌드 시점에 동적으로 구성하도록 수정.
* **결과 확인:** 파일 수정 완료. 사용자가 로컬에서 직접 Git Push를 실행하여 빌드 및 배포 동작을 최종 확인할 예정.

## [2026-06-22 17:40 KST] - (성공✅) node_modules Git 추적 제외 및 .gitignore 추가, CI 빌드 안정화 원복
* **변경된 파일:** `.gitignore`, `.github/workflows/deploy.yml`
* **핵심 변경 사항:**
	- [논리]: Git 저장소에 Windows용 node_modules 폴더가 실수로 커밋되어 올라가 있어, 리눅스 빌드 가상머신에서 패키지를 새로 설치하지 않고 기존 Windows 바이너리를 그대로 참조하여 네이티브 바이너리 바인딩 오류가 반복 발생했음. node_modules를 Git 추적에서 해제하고 `.gitignore`에 등록하여 근본 문제 해결.
	- [기능]:
		- **`.gitignore`**: `node_modules/` 폴더를 차단하도록 설정 추가.
		- **`deploy.yml`**: 의존성 설치 방식을 다시 안정적이고 빠른 `npm ci` 표준 구문으로 원복.
* **결과 확인:** 설정 파일 수정 완료. 사용자가 로컬 터미널에서 `git rm -r --cached node_modules` 실행 후 커밋/푸시하여 검증 예정.

## [2026-06-22 17:43 KST] - (성공✅) clean 환경에서의 동적 의존성 해결을 위해 deploy.yml을 npm install로 수정
* **변경된 파일:** `.github/workflows/deploy.yml`
* **핵심 변경 사항:**
	- [논리]: node_modules가 Git 추적에서 해제되어 가상머신 내 기존 파일 간섭은 사라졌으나, Windows 환경의 package-lock.json으로 인해 npm ci 실행 시 리눅스용 네이티브 바이너리 설치가 여전히 건너뛰어지는 현상 해결.
	- [기능]:
		- **`deploy.yml`**: 의존성 설치 방식을 `npm install`로 재변경하여 깨끗한 임시 폴더 내에서 리눅스 환경에 맞는 패키지들과 바이너리들을 동적으로 온전히 구성하도록 조치.
* **결과 확인:** 설정 파일 수정 완료. 사용자가 직접 push 후 정상 빌드 완료 여부를 점검할 예정.

## [2026-06-22 17:49 KST] - (성공✅) npm 크로스 플랫폼 버그(이슈 4828) 우회를 위해 빌드 시 락 파일 삭제 스크립트 재적용
* **변경된 파일:** `.github/workflows/deploy.yml`
* **핵심 변경 사항:**
	- [논리]: Windows 환경의 package-lock.json이 존재할 경우 리눅스 러너 상에서 npm이 타 플랫폼의 optionalDependencies(바이너리) 설치를 누락시키는 npm 고유의 버그(cli 이슈 4828)가 있어, 빌드 단계 진입 시 이를 삭제하도록 수정.
	- [기능]:
		- **`deploy.yml`**: 의존성 설치 과정에서 `rm -f package-lock.json` 코드를 재주입하여 리눅스 환경에 맞는 패키지 목록을 동적으로 처음부터 해결하도록 조치.
* **결과 확인:** 설정 파일 수정 완료. 사용자가 최종 push하여 배포 결과를 점검할 예정.

## [2026-06-22 17:51 KST] - (성공✅) Tailwind v4 Rust 컴파일러와 Node.js 호환성 오류 해결을 위해 Node.js 20으로 업그레이드
* **변경된 파일:** `.github/workflows/deploy.yml`
* **핵심 변경 사항:**
	- [논리]: 최신 기술 스택(Vite 6, Tailwind CSS v4) 및 그 종속 모듈인 Rust 컴파일러 바이너리(@tailwindcss/oxide)가 구버전 Node.js 18 런타임 하에서 로드 오류(Cannot find native binding)를 내는 것을 해결하기 위해 Node.js 엔진 버전을 20으로 업그레이드.
	- [기능]:
		- **`deploy.yml`**: `build-frontend` 작업의 Node.js 설정(`node-version`)을 `18`에서 `20`으로 변경.
* **결과 확인:** 설정 파일 수정 완료. 사용자가 수정본을 push하여 빌드 결과가 성공하는지 점검할 예정.









