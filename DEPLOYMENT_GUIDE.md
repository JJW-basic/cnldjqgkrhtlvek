# 배포 가이드라인

## 1. 로컬 테스트 가이드라인

### 사전 준비
- Docker Desktop 실행 확인
- Node.js 20+ 설치 확인

### Step 1 — 환경 변수 설정
```bash
# .env 파일의 DOCKER_USER를 본인 Docker Hub 계정으로 수정
# SECRET_KEY도 임의의 강력한 값으로 변경 권장
```

### Step 2 — React 프론트엔드 빌드
```bash
npm install
npm run build
# dist/ 폴더가 생성됨
```

### Step 3 — Docker Compose 전체 스택 실행
```bash
docker-compose up -d --build
```

### Step 4 — 접속 확인

| 서비스 | URL |
|---|---|
| React SPA | http://localhost |
| FastAPI Swagger | http://localhost/api/docs |
| FastAPI 직접 | http://localhost:8000/api/docs |

### Step 5 — 로컬 개발 (핫리로드)
```bash
# 터미널 1: Redis + AI Worker만 Docker로 실행
docker-compose up -d redis ai-worker

# 터미널 2: FastAPI 로컬 실행
uv sync --group app
uv run uvicorn app.main:app --reload

# 터미널 3: React 개발 서버 (Vite 프록시로 FastAPI 연결)
npm run dev
# http://localhost:5173 접속
```

### 동작 흐름 검증

1. `http://localhost:5173` → 로그인 페이지 (카카오/네이버 버튼 클릭 시 서비스 선택 페이지로 이동)
2. 만성질환 예측 설문 → 80문항 완료 → "분석 요청" 클릭
3. FastAPI `POST /api/v1/prediction/` → Redis `prediction_queue`에 lpush
4. AI Worker BRPOP으로 수신 → ChronicDiseasePredictor 추론 → Redis `result:{task_id}` 저장
5. 프론트엔드 폴링 → 결과 수신 → 대시보드 페이지 이동

---

## 2. AWS 배포 가이드라인 (무료 티어 기준)

### 무료 티어 구성 (12개월)

| 서비스 | 스펙 | 용도 |
|---|---|---|
| EC2 t2.micro | 1vCPU / 1GB RAM | 전체 서비스 실행 |
| S3 (선택) | 5GB | React 정적 파일 (CloudFront 연동 시) |

> ⚠️ **리스크**: t2.micro 1GB RAM은 PyTorch 모델 로딩 시 OOM 발생 가능.
> `mem_limit: 1G`로 제한하거나 t3.small(유료) 권장.

### Step 1 — EC2 인스턴스 생성

1. AWS Console → EC2 → 인스턴스 시작
2. AMI: **Ubuntu 22.04 LTS** 선택
3. 인스턴스 유형: **t2.micro** (프리 티어)
4. 보안 그룹 인바운드 규칙 설정:

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

### Step 3 — 코드 배포

```bash
# 방법 A: GitHub에서 clone
git clone https://github.com/<your-repo>.git
cd AI_HealthCare_Final_Project_Template

# 방법 B: scp로 로컬에서 직접 전송
scp -i ~/.ssh/your-key.pem -r ./ ubuntu@<EC2_IP>:~/app/
```

### Step 4 — 환경 변수 설정 및 실행

```bash
# EC2에서
cd ~/app

# .env 수정: REDIS_HOST=redis, SECRET_KEY=<강력한 키>
cp envs/example.local.env .env
nano .env

# React 빌드 (EC2에서 직접 실행 또는 로컬 빌드 후 dist/ 업로드)
npm install && npm run build

# 전체 스택 실행
docker compose up -d --build
```

### Step 5 — 도메인 + HTTPS 설정 (선택)

```bash
# 1. 도메인 구매 후 Route53 또는 가비아에서 EC2 IP로 A 레코드 설정
# 2. nginx/default.conf의 server_name을 도메인으로 변경
# 3. Certbot 스크립트 실행

chmod +x scripts/certbot.sh
./scripts/certbot.sh
# 프롬프트: 도메인, 이메일, SSH 키 파일명, EC2 IP 순서로 입력
```

### Step 6 — 자동 배포 스크립트 활용

```bash
# Docker Hub에 이미지 푸시 후 EC2 자동 배포
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
- OAuth 실제 연동 시 `app/apis/v1/auth_routers.py`의 `oauth_callback` 엔드포인트에 카카오/네이버 토큰 검증 로직 구현
- AI Worker `restart: always` 설정으로 크래시 시 자동 복구됨

### 현재 제한 사항 (Current Limitations)
- OAuth 로그인은 현재 mock 처리 (JWT 미발급) — 설문 API는 인증 없이 호출 가능한 상태
- 테스트 모드 "바로 분석" 버튼은 여전히 mock 결과 사용 — 실제 API 호출로 교체 필요 시 `handleSubmit`과 동일한 폴링 패턴 적용
