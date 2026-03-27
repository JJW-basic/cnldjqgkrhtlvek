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
