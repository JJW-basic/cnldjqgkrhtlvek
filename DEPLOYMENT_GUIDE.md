# 배포 가이드라인

## 1. 로컬 테스트 가이드라인

### 사전 준비
- Docker Desktop 실행 확인
- Node.js 20+ 설치 확인
- 카카오/네이버 개발자 콘솔에서 앱 등록 및 Redirect URI 설정

### Step 1 — OAuth 앱 등록 (카카오/네이버)

#### 카카오
1. [카카오 개발자 콘솔](https://developers.kakao.com) → 내 애플리케이션 → 앱 추가
2. 플랫폼 → Web → 사이트 도메인: `http://localhost`
3. 카카오 로그인 → 활성화 ON
4. Redirect URI 등록: `http://localhost/oauth/callback/kakao`
5. 앱 키 → REST API 키 복사

#### 네이버
1. [네이버 개발자 센터](https://developers.naver.com) → Application → 애플리케이션 등록
2. 사용 API: 네이버 로그인 선택
3. 서비스 URL: `http://localhost`
4. Callback URL: `http://localhost/oauth/callback/naver`
5. Client ID / Client Secret 복사

### Step 2 — 환경 변수 설정

`.env` 파일에서 OAuth 키 값을 실제 발급받은 값으로 교체:

```env
KAKAO_CLIENT_ID=<카카오 REST API 키>
KAKAO_CLIENT_SECRET=<카카오 Client Secret>
KAKAO_REDIRECT_URI=http://localhost/oauth/callback/kakao

NAVER_CLIENT_ID=<네이버 Client ID>
NAVER_CLIENT_SECRET=<네이버 Client Secret>
NAVER_REDIRECT_URI=http://localhost/oauth/callback/naver

SECRET_KEY=<강력한 랜덤 문자열>
```

### Step 3 — React 프론트엔드 빌드

```bash
npm install
npm run build
# dist/ 폴더 생성됨
```

### Step 4 — Docker Compose 전체 스택 실행

```bash
docker compose up -d --build
```

### Step 5 — 접속 확인

| 서비스 | URL |
|---|---|
| React SPA | http://localhost |
| FastAPI Swagger | http://localhost/api/docs |
| 카카오 로그인 | http://localhost/api/v1/auth/kakao/login |
| 네이버 로그인 | http://localhost/api/v1/auth/naver/login |

---

### 인증 시스템 동작 상세

#### 인증 가드 구조 (SRP 적용)

`useAuth` 훅이 모든 인증 로직의 단일 책임을 가지며, `ProtectedLayout`과 `RootRedirect`가 이를 공유합니다.
인증 관련 로직 추가·수정은 `useAuth.ts` 한 파일만 변경하면 양쪽에 자동 반영됩니다.

```
┌─────────────────────────────────────────────────────────────┐
│  useAuth 훅 (인증 로직 단일 책임 허브)                       │
│  1. 동기 선확인(getTokenSync) → 토큰 있으면 즉시 반환        │
│  2. 비동기 확인(getToken) → BroadcastChannel 500ms 대기      │
│  3. 토큰 만료 임박 자동 갱신 → exp 기준 30초 전 실행         │
│  4. 타 탭 로그아웃(TOKEN_CLEAR) 수신 → 즉시 상태 전환        │
│  반환값: "loading" | "authenticated" | "unauthenticated"     │
└──────────────┬──────────────────────────┬───────────────────┘
               │                          │
               ▼                          ▼
┌──────────────────────────┐  ┌───────────────────────────────┐
│  ProtectedLayout         │  │  RootRedirect (/)             │
│  - 보호 경로 가드         │  │  - authenticated → /services  │
│  - 비활동 타이머 시작     │  │  - unauthenticated → 로그인   │
└──────────────┬───────────┘  └───────────────────────────────┘
               │ 통과
┌──────────────▼──────────────────────────────────────────────┐
│  FastAPI Depends(get_request_user) (서버 검증)               │
│  - JWT Bearer 토큰 서명/만료 검증 → 실패 시 HTTP 401         │
└─────────────────────────────────────────────────────────────┘

Layout 역할: 헤더 표시 분기만 담당 (/, /oauth/callback/* → 헤더 없음)
```

#### 경로별 접근 제어 매트릭스

| 경로 | 토큰 없음 | 토큰 있음 |
|---|---|---|
| `/` (루트) | 로그인 페이지 표시 | `/services`로 자동 이동 |
| `/oauth/callback/:provider` | 허용 (OAuth 처리 중) | 허용 (OAuth 처리 중) |
| `/services`, `/survey`, `/dashboard`, `/ai-model`, `/tech-stack` | `/`로 리다이렉트 | 서비스 정상 접근 |
| 새 탭에서 보호 경로 직접 접근 | `/`로 리다이렉트 | BroadcastChannel 토큰 수신 후 정상 접근 |
| `/api/v1/prediction/*` | HTTP 401 반환 | 정상 처리 |

#### 전체 로그인 흐름

```
1. http://localhost 접속
   ├─ 토큰 있음 → /services 자동 이동 (RootRedirect)
   └─ 토큰 없음 → 로그인 페이지 표시

2. 카카오/네이버 버튼 클릭
   → /api/v1/auth/{provider}/login → 307 redirect → OAuth 로그인 페이지

3. 사용자 동의 → redirect_uri로 인가 코드 전달
   - 카카오: http://localhost/oauth/callback/kakao?code=...
   - 네이버: http://localhost/oauth/callback/naver?code=...&state=...

4. OAuthCallbackPage → /api/v1/auth/{provider}/callback 호출
   → FastAPI: 토큰 교환 → 사용자 ID 조회 → 내부 JWT 발급
   → access_token + expires_in: tokenStore(sessionStorage) 저장
   → refresh_token: HttpOnly Cookie (서버 발급)

5. /services 페이지로 이동
```

#### 토큰 저장 전략 (tokenStore.ts)

```
저장소: sessionStorage
  - 탭/브라우저 종료 시 자동 소멸 (보안)
  - 탭 간 공유: BroadcastChannel API 활용

탭 간 동기화 흐름:
  새 탭 오픈 → ProtectedLayout 마운트
  → TOKEN_REQUEST 브로드캐스트
  → 기존 탭이 TOKEN_RESPONSE로 토큰 + expires_in 전달 (최대 500ms 대기)
  → 새 탭 sessionStorage에 저장 → 서비스 정상 접근

로그아웃 시:
  → TOKEN_CLEAR 브로드캐스트 → 모든 탭 sessionStorage 동시 초기화
```

#### access_token 자동 갱신 (apiClient.ts)

```
API 호출 → 401 응답 수신
→ GET /api/v1/auth/token/refresh (HttpOnly Cookie의 refresh_token 사용)
→ 성공: 새 access_token + expires_in을 tokenStore에 저장 → 원래 요청 재시도
→ 실패(refresh_token 만료): tokenStore.clearToken() → / 강제 이동

동시 다중 요청 시: refreshQueue 패턴으로 중복 갱신 방지
```

#### 비활동 자동 로그아웃 (useIdleLogout.ts)

```
감지 이벤트: mousedown, keydown, touchstart, scroll, click

비활동 타이머 기준값: 서버 응답의 expires_in(초) → ms 변환
  - 로그인/토큰 갱신 응답에 expires_in 포함 → tokenStore에 저장
  - ProtectedLayout이 getExpiresInMs()로 읽어 useIdleLogout에 전달
  - 서버의 ACCESS_TOKEN_EXPIRE_MINUTES 변경 시 프론트엔드 코드 수정 불필요

활동 감지 시:
  → 비활동 타이머 리셋 (expires_in ms)
  → 5분 쿨다운 내 서버 토큰 갱신 (활동 중 만료 방지)
  → 갱신 응답의 expires_in도 tokenStore에 업데이트

비활동 expires_in 경과 시:
  → tokenStore.clearToken() (모든 탭 토큰 삭제)
  → POST /api/v1/auth/logout (서버 쿠키 삭제)
  → / (로그인 페이지)로 이동
```

#### 로그아웃 흐름

```
로그아웃 버튼 클릭
→ POST /api/v1/auth/logout (서버: refresh_token 쿠키 Max-Age=0 삭제)
→ tokenStore.clearToken() (현재 탭 sessionStorage 삭제 + 모든 탭에 TOKEN_CLEAR 브로드캐스트)
→ / (로그인 페이지)로 이동
```

---

### 로컬 개발 (핫리로드)

```bash
# 터미널 1: Redis + AI Worker만 Docker로 실행
docker compose up -d redis ai-worker

# 터미널 2: FastAPI 로컬 실행
uv sync --group app
uv run uvicorn app.main:app --reload

# 터미널 3: React 개발 서버
npm run dev
# http://localhost:5173 접속
```

> **로컬 개발 시 OAuth Redirect URI 주의**: 카카오/네이버 콘솔에 `http://localhost:5173/oauth/callback/{provider}`도 추가 등록 필요.

---

## 2. AWS 배포 가이드라인 (무료 티어 기준)

### 무료 티어 구성 (12개월)

| 서비스 | 스펙 | 용도 |
|---|---|---|
| EC2 t2.micro | 1vCPU / 1GB RAM | 전체 서비스 실행 |
| S3 (선택) | 5GB | React 정적 파일 (CloudFront 연동 시) |

> ⚠️ **리스크**: t2.micro 1GB RAM은 PyTorch 모델 로딩 시 OOM 발생 가능. Swap 2GB 추가 필수.

### Step 1 — EC2 인스턴스 생성

1. AWS Console → EC2 → 인스턴스 시작
2. AMI: **Ubuntu 22.04 LTS** 선택
3. 인스턴스 유형: **t2.micro** (프리 티어)
4. 보안 그룹 인바운드 규칙:

| 포트 | 프로토콜 | 소스 | 용도 |
|---|---|---|---|
| 22 | TCP | 내 IP | SSH |
| 80 | TCP | 0.0.0.0/0 | HTTP |
| 443 | TCP | 0.0.0.0/0 | HTTPS (SSL 적용 시) |

### Step 2 — EC2 초기 설정

```bash
ssh -i ~/.ssh/your-key.pem ubuntu@<EC2_IP>

# Docker 설치
sudo apt update && sudo apt install -y docker.io docker-compose-plugin
sudo usermod -aG docker ubuntu
# 재접속 후 적용

# Swap 메모리 추가 (t2.micro OOM 방지)
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### Step 3 — OAuth 앱 Redirect URI 프로덕션 등록

배포 도메인이 확정되면 카카오/네이버 콘솔에서 Redirect URI 추가:
- 카카오: `https://yourdomain.com/oauth/callback/kakao`
- 네이버: `https://yourdomain.com/oauth/callback/naver`

### Step 4 — 코드 배포 및 환경 변수 설정

```bash
git clone https://github.com/<your-repo>.git
cd AI_HealthCare_Final_Project_Template

# .env 수정 (프로덕션 값으로 교체)
cp envs/example.prod.env .env
nano .env
# REDIS_HOST=redis
# SECRET_KEY=<강력한 랜덤 키>
# KAKAO_REDIRECT_URI=https://yourdomain.com/oauth/callback/kakao
# NAVER_REDIRECT_URI=https://yourdomain.com/oauth/callback/naver

# React 빌드
npm install && npm run build

# 전체 스택 실행
docker compose up -d --build
```

### Step 5 — 도메인 + HTTPS 설정

```bash
# 1. 도메인 구매 후 EC2 IP로 A 레코드 설정
# 2. nginx/prod_https.conf의 server_name을 도메인으로 변경
# 3. Certbot 스크립트 실행
chmod +x scripts/certbot.sh
./scripts/certbot.sh
```

> HTTPS 적용 후 `app/apis/v1/auth_routers.py`의 `set_cookie` 호출에서 `secure=False` → `secure=True`로 변경 필수.

### Step 6 — 자동 배포 스크립트

```bash
chmod +x scripts/deployment.sh
./scripts/deployment.sh
# 프롬프트: Docker Hub 계정, 레포지토리명, 버전 태그, SSH 키, EC2 IP 순서로 입력
```

---

## 주의 사항

### 잠재적 리스크
BroadcastChannel은 동일 브라우저 내 탭 간에만 동작 — 서로 다른 브라우저(Chrome/Firefox)에서 동시 로그인 시 토큰이 공유되지 않으며, 각 브라우저에서 독립적으로 OAuth 인증이 필요하다.

### 권장 사항 (Best Practice)
- 프로덕션 배포 전 `.env`의 `SECRET_KEY`를 반드시 강력한 랜덤 값으로 교체
- HTTPS 적용 후 `auth_routers.py`의 `set_cookie(secure=False)` → `secure=True`로 변경
- 카카오/네이버 콘솔에서 Redirect URI를 배포 도메인으로 정확히 등록 (불일치 시 OAuth 오류 발생)
- 비활동 타이머는 서버 응답의 `expires_in` 값을 자동으로 사용 — `ACCESS_TOKEN_EXPIRE_MINUTES` 변경 시 프론트엔드 코드 수정 불필요
- AI Worker `restart: always` 설정으로 크래시 시 자동 복구됨

### 현재 제한 사항 (Current Limitations)
- 테스트 모드 "바로 분석" 버튼은 mock 결과 사용 — 실제 AI 추론 필요 시 `handleSubmit`과 동일한 폴링 패턴 적용
- BroadcastChannel은 IE 미지원 — 대상 브라우저가 Chrome/Firefox/Safari 최신 버전이면 문제 없음
- refresh_token 만료(14일) 후에는 재로그인 필요
