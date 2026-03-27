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
| React SPA (로그인 페이지) | http://localhost |
| FastAPI Swagger | http://localhost/api/docs |
| 카카오 로그인 redirect | http://localhost/api/v1/auth/kakao/login |
| 네이버 로그인 redirect | http://localhost/api/v1/auth/naver/login |

### 전체 로그인 흐름

```
1. http://localhost → 로그인 페이지 (카카오/네이버 버튼)
2. 버튼 클릭 → /api/v1/auth/{provider}/login → 307 redirect → 카카오/네이버 로그인 페이지
3. 사용자 로그인 동의 → redirect_uri로 인가 코드(code) 전달
   - 카카오: http://localhost/oauth/callback/kakao?code=...
   - 네이버: http://localhost/oauth/callback/naver?code=...&state=...
4. Nginx → React SPA index.html 서빙 (SPA 라우팅)
5. OAuthCallbackPage → /api/v1/auth/{provider}/callback?code=... 호출
6. FastAPI → 카카오/네이버 토큰 교환 → 사용자 ID 조회 → 내부 JWT 발급
7. access_token → sessionStorage 저장, refresh_token → HttpOnly Cookie
8. /services 페이지로 이동
```

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
# Vite 프록시 설정 필요: vite.config.ts에 proxy 추가
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

### Step 6 — 자동 배포 스크립트

```bash
chmod +x scripts/deployment.sh
./scripts/deployment.sh
# 프롬프트: Docker Hub 계정, 레포지토리명, 버전 태그, SSH 키, EC2 IP 순서로 입력
```

---

## 주의 사항

### 잠재적 리스크
t2.micro 1GB RAM에서 PyTorch 7-fold 앙상블 모델 동시 로딩 시 OOM으로 AI Worker 크래시 가능 — **Swap 2GB 추가 필수**.

### 권장 사항 (Best Practice)
- 프로덕션 배포 전 `.env`의 `SECRET_KEY`를 반드시 강력한 랜덤 값으로 교체
- 카카오/네이버 콘솔에서 Redirect URI를 배포 도메인으로 정확히 등록 (불일치 시 OAuth 오류 발생)
- HTTPS 적용 후 `.env`의 `KAKAO_REDIRECT_URI`, `NAVER_REDIRECT_URI`를 `https://` 주소로 변경
- AI Worker `restart: always` 설정으로 크래시 시 자동 복구됨

### 현재 제한 사항 (Current Limitations)
- 테스트 모드 "바로 분석" 버튼은 mock 결과 사용 — 실제 AI 추론 필요 시 `handleSubmit`과 동일한 폴링 패턴 적용
