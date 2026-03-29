# DEPLOYMENT GUIDE

만성질환 예측 AI 서비스 — 로컬 테스트 및 AWS 배포 가이드

---

## 인증 아키텍처 개요

### 토큰 발행 조건 (3가지 모두 충족 필요)

| 조건 | 내용 |
|------|------|
| 1 | 로그인 페이지의 카카오/네이버 인증 버튼 클릭 |
| 2 | OAuth API 인증 통과 + **본인인증 완료 계정** 검증 통과 |
| 3 | 동의 페이지(`/consent`)에서 사용자 동의 확인 |

### 본인인증 검증 필드

**카카오** — `is_certified_needs_agreement` 키 존재 여부에 따라 조건부 검증:

| 상황 | 동작 |
|------|------|
| `is_certified_needs_agreement` 키가 응답에 없음 | 앱 동의항목 미설정 → 검증 건너뜀 (id만으로 통과) |
| `is_certified_needs_agreement = true` | 사용자 동의 거부 → HTTP 403 |
| `is_certified_needs_agreement = false` + `is_certified = true` + `certified_at` 존재 | 본인인증 완료 → 통과 |
| `is_certified_needs_agreement = false` + `is_certified = false` | 본인인증 미완료 → HTTP 403 |

- 앱 동의항목에 본인인증 항목 설정 시 실제 검증 활성화
- 미통과 시: HTTP 403 + 안내 메시지 → ConsentPage 차단 화면

**네이버** — `is_certified` 키 존재 여부에 따라 조건부 검증:

| 상황 | 동작 |
|------|------|
| `is_certified` 키가 응답에 없음 | 앱 설정 미완료 → 검증 건너뜀 (id만으로 통과) |
| `is_certified = "true"` | 본인인증 완료 → 통과 |
| `is_certified = "false"` | 본인인증 미완료 → HTTP 403 |

- 네이버 개발자 센터에서 `본인인증 여부` 제공 정보 설정 시 실제 검증 활성화
- 미통과 시: HTTP 403 + 안내 메시지 → ConsentPage 차단 화면

### 라우트 접근 제어 매트릭스

| 경로 | 토큰 없음 | 토큰 있음 | 가드 |
|------|-----------|-----------|------|
| `/` (로그인) | ✅ 로그인 페이지 | 🔀 `/services` | GuestRoute |
| `/oauth/callback/:provider` | ✅ → `/consent` 이동 | 🔀 `/services` | 공개 |
| `/consent` (pending_code 있음) | ✅ 동의 페이지 | 🔀 `/services` | ConsentRoute |
| `/consent` (pending_code 없음) | 🔀 `/` | 🔀 `/services` | ConsentRoute |
| `/services`, `/survey` 등 | 🔀 `/` | ✅ 서비스 이용 | ProtectedLayout |
| `POST /api/v1/prediction/` | ❌ HTTP 401 | ✅ HTTP 202 | get_request_user |

### 인증 흐름

```
[로그인 페이지 /]
    ↓ 카카오/네이버 버튼 클릭 (기준 1)
[OAuth Provider] → 인가 코드 발급
    ↓ /oauth/callback/:provider
[OAuthCallbackPage] → 인가 코드 sessionStorage 임시 저장 → /consent 이동
    ↓ ConsentRoute 가드 통과 (토큰 없음 + pending_code 있음)
[ConsentPage] → 사용자 동의 확인 (기준 3)
    ↓ 동의 클릭 → GET /api/v1/auth/{provider}/callback
[FastAPI] → 본인인증 검증 (기준 2)
    ├─ 미완료 → HTTP 403 + 사유 → ConsentPage 차단 화면 → 로그인 페이지
    └─ 완료 → JWT(access) + refresh_token(httpOnly cookie) 발급
    ↓ login() = setToken() + setAuthState("authenticated") 원자적 처리
    ↓ ConsentPage useEffect([authState]) → "authenticated" 감지 → navigate("/services")
[ProtectedLayout] → /services 서비스 이용 (기준 5)
```

### 가드 컴포넌트 구조

```
Layout
├── GuestRoute          → /         : 토큰 있으면 /services
├── OAuthCallbackPage   → /oauth/callback/:provider
├── ConsentRoute        → /consent  : 토큰 있으면 /services, pending_code 없으면 /
│   └── ConsentPage
└── ProtectedLayout     → /services, /survey, /dashboard, /ai-model, /tech-stack
    ├── ServiceSelectionPage  ← 기준 7: 토큰 있는 사용자 기본 페이지
    ├── SurveyPage
    ├── DashboardPage
    ├── AIModelPage
    └── TechStackPage
```

---

## 로컬 테스트 가이드라인

### 사전 준비

- Docker Desktop 설치 및 실행
- Node.js 18+ 설치
- 카카오/네이버 OAuth 앱 등록

### 1. OAuth 앱 설정

**카카오 개발자 콘솔** (https://developers.kakao.com):
- 앱 → 카카오 로그인 → 활성화
- Redirect URI 추가: `http://localhost/oauth/callback/kakao`
- 동의항목 → `카카오계정(이메일)` 및 본인인증 관련 항목 활성화
  - `is_certified`, `certified_at`은 기본 `kakao_account` 동의 항목에 포함
  - 테스트 계정 등록: 앱 → 팀원 관리 → 테스트 계정 추가

**네이버 개발자 센터** (https://developers.naver.com):
- 애플리케이션 → API 설정 → Callback URL: `http://localhost/oauth/callback/naver`
- 제공 정보: `본인인증 여부(is_certified)` 포함 확인

### 2. 환경 변수 설정

```bash
# Windows
copy envs\example.local.env envs\.local.env
copy envs\.local.env .env
```

`envs/.local.env` 필수 항목:

```env
SECRET_KEY=your-secret-key-here
KAKAO_CLIENT_ID=your-kakao-client-id
KAKAO_CLIENT_SECRET=your-kakao-client-secret
KAKAO_REDIRECT_URI=http://localhost/oauth/callback/kakao
NAVER_CLIENT_ID=your-naver-client-id
NAVER_CLIENT_SECRET=your-naver-client-secret
NAVER_REDIRECT_URI=http://localhost/oauth/callback/naver
```

### 3. 프론트엔드 빌드

```bash
npm install
npm run build
```

### 4. 전체 스택 실행

```bash
docker compose up -d --build
```

서비스 접속:
- 서비스: http://localhost
- API 문서: http://localhost/api/docs

### 5. 엔드포인트 점검

```powershell
# 프론트엔드 (200)
(Invoke-WebRequest "http://localhost/" -UseBasicParsing).StatusCode

# API 문서 (200)
(Invoke-WebRequest "http://localhost/api/openapi.json" -UseBasicParsing).StatusCode

# 카카오 로그인 시작 (307)
(Invoke-WebRequest "http://localhost/api/v1/auth/kakao/login" -MaximumRedirection 0 -EA SilentlyContinue).StatusCode

# 인증 없이 예측 요청 (401)
(Invoke-WebRequest "http://localhost/api/v1/prediction/" -Method POST -ContentType "application/json" -Body "{}" -EA SilentlyContinue).StatusCode

# 쿠키 없이 토큰 갱신 (401)
(Invoke-WebRequest "http://localhost/api/v1/auth/token/refresh" -EA SilentlyContinue).StatusCode

# 로그아웃 (200)
(Invoke-WebRequest "http://localhost/api/v1/auth/logout" -Method POST -UseBasicParsing).StatusCode
```

### 6. 인증 흐름 수동 테스트 시나리오

**정상 흐름 (본인인증 완료 계정):**
1. http://localhost 접속 → 로그인 페이지 확인
2. 카카오/네이버 로그인 버튼 클릭 → OAuth 인증
3. `/consent` 자동 이동 확인
4. "동의하고 시작하기" 클릭 → `/services` 이동 확인
5. 주소창에 `http://localhost/` 입력 → `/services` 즉시 리다이렉트 (로그인 페이지 노출 없음)
6. 주소창에 `http://localhost/consent` 직접 입력 → `/services` 리다이렉트 (토큰 있으므로)
7. 로그아웃 → 로그인 페이지 이동 + sessionStorage 토큰 삭제 확인

**본인인증 미완료 차단 흐름:**
1. 본인인증 미완료 계정으로 로그인 시도
2. `/consent`에서 "동의하고 시작하기" 클릭
3. 차단 화면 표시 확인:
   - 카카오: "본인인증을 완료한 카카오 계정만 이용할 수 있습니다. 카카오 계정 설정 → 보안 → 본인인증을 완료한 후 다시 시도해 주세요."
   - 네이버: "본인인증을 완료한 네이버 계정만 이용할 수 있습니다. 네이버 계정 설정 → 보안 → 본인인증을 완료한 후 다시 시도해 주세요."
4. "로그인 페이지로 돌아가기" 클릭 → `/` 이동 확인

**직접 URL 접근 차단 흐름:**
1. 로그아웃 상태에서 `http://localhost/services` 직접 입력 → `/` 리다이렉트
2. 로그아웃 상태에서 `http://localhost/consent` 직접 입력 → `/` 리다이렉트 (pending_code 없음)
3. 로그인 상태에서 `http://localhost/consent` 직접 입력 → `/services` 리다이렉트

### 7. 로그 확인

```bash
docker compose ps
docker compose logs -f fastapi
docker compose logs -f ai-worker
```

### 8. 개별 서비스 재빌드

```bash
# FastAPI 코드 변경 후
docker compose up -d --build fastapi
docker compose restart nginx

# 프론트엔드 변경 후
npm run build
docker compose restart nginx
```

---

## AWS 배포 가이드라인

### 사전 준비

- AWS EC2 인스턴스 (Ubuntu 22.04 LTS, t3.medium 이상 권장)
- EC2 보안 그룹 인바운드: 22(SSH), 80(HTTP), 443(HTTPS)
- Docker Hub 계정 + Personal Access Token (PAT)
- 도메인 (Route53, Gabia, GoDaddy 등)
- SSH 키 페어 (`~/.ssh/` 경로)

### 1. EC2 초기 설정

```bash
ssh -i ~/.ssh/your-key.pem ubuntu@<EC2_IP>

sudo apt-get update
sudo apt-get install -y docker.io docker-compose-plugin
sudo systemctl enable --now docker
sudo usermod -aG docker ubuntu
newgrp docker

docker --version && docker compose version
```

### 2. OAuth 앱 Redirect URI 업데이트

**카카오**: `https://yourdomain.com/oauth/callback/kakao`
**네이버**: `https://yourdomain.com/oauth/callback/naver`

### 3. 프로덕션 환경 변수 설정

`envs/.prod.env`:

```env
ENV=prod
SECRET_KEY=your-strong-secret-key-min-32-chars
COOKIE_DOMAIN=yourdomain.com

KAKAO_CLIENT_ID=your-kakao-client-id
KAKAO_CLIENT_SECRET=your-kakao-client-secret
KAKAO_REDIRECT_URI=https://yourdomain.com/oauth/callback/kakao

NAVER_CLIENT_ID=your-naver-client-id
NAVER_CLIENT_SECRET=your-naver-client-secret
NAVER_REDIRECT_URI=https://yourdomain.com/oauth/callback/naver

REDIS_HOST=redis
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_MINUTES=20160
```

### 4. 프론트엔드 프로덕션 빌드

```bash
npm run build
```

### 5. 자동 배포 스크립트

```bash
chmod +x scripts/deployment.sh
./scripts/deployment.sh
```

입력 항목:
1. Docker Hub Username
2. Docker Hub PAT
3. Repository 이름
4. 배포 서비스 (FastAPI / AI-Worker)
5. 버전 태그 (예: `v1.0.0`)
6. SSH 키 파일명
7. EC2 Public IP
8. HTTPS 사용 여부 → 도메인 입력

### 6. SSL/HTTPS 설정

```bash
chmod +x scripts/certbot.sh
./scripts/certbot.sh
```

입력 항목:
1. 도메인 (예: `yourdomain.com`)
2. 이메일
3. SSH 키 파일명
4. EC2 Public IP

### 7. 배포 후 확인

```bash
docker compose ps

curl -o /dev/null -w "%{http_code}" https://yourdomain.com/
curl -o /dev/null -w "%{http_code}" https://yourdomain.com/api/openapi.json
curl -o /dev/null -w "%{http_code}" -L https://yourdomain.com/api/v1/auth/kakao/login
```

---

## 트러블슈팅

### Nginx 502 Bad Gateway

FastAPI 컨테이너 재생성 후 Nginx DNS 캐시 문제:

```bash
docker compose restart nginx
```

### 카카오 본인인증 검증 실패

- 카카오 개발자 콘솔에서 동의항목에 본인인증 항목을 설정하지 않으면 `is_certified_needs_agreement` 키가 응답에 없음 → 검증 건너뜀
- 동의항목 설정 후 `needs_agreement=true`이면 사용자가 동의 거부한 것 → HTTP 403
- `is_certified=false`이면 실제 본인인증 미완료 → HTTP 403

### 네이버 본인인증 검증 실패

- 네이버 개발자 센터 → 앱 → API 설정 → 제공 정보에 `본인인증 여부` 체크 필요
- `is_certified` 필드는 문자열 `"true"`/`"false"`로 반환됨 (boolean 아님)

### OAuth state 만료 오류 (네이버)

Redis TTL 5분 초과 시 발생. 로그인 페이지에서 다시 시도.

### sessionStorage 토큰 미저장

- 동일 탭에서만 유효 (새 탭 = 재로그인 필요 — 설계 의도)
- 브라우저 종료 시 자동 소멸

---

## 보안 체크리스트

- [ ] `SECRET_KEY` 프로덕션 전용 강력한 값 (32자 이상 랜덤)
- [ ] `ENV=prod` 설정 → `secure=True` 쿠키 자동 적용
- [ ] OAuth Redirect URI HTTPS로 업데이트
- [ ] EC2 보안 그룹 최소 권한 원칙 적용
- [ ] Redis 포트(6379) 외부 노출 차단 (프로덕션 docker-compose에서 `ports` 제거)
- [ ] Docker Hub 이미지 프라이빗 설정 권장
- [ ] 네이버 앱 제공 정보에 `본인인증 여부(is_certified)` 포함 확인
