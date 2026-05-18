# 만성질환 예측 AI 서비스 (AI Healthcare Service)

이 프로젝트는 KNHANES(국민건강영양조사) 데이터를 기반으로 4가지 만성질환(알레르기비염, 고혈압, 당뇨병, 이상지질혈증)의 위험도를 예측하고 생활 개선 가이드라인을 제공하는 AI 서비스입니다. 
전체 시스템은 **Stateless 기반의 Zero PII 아키텍처**로 설계되어 개인정보를 수집/저장하지 않으며, **Amazon Web Services (AWS) EC2 m7i-flex.large (x86_64)** 인프라에 최적화되어 있습니다.

---

## 🚀 주요 특징

- **Zero PII & Stateless Architecture**: 외부 OAuth 인증(Kakao, Naver)만을 활용하며, 데이터베이스(RDBMS)를 사용하지 않아 개인정보(이름, 나이 등) 수집을 원천적으로 배제합니다.
- **비동기 AI 추론 (Task Queue)**: FastAPI 서버와 PyTorch AI Worker 간의 결합도를 낮추고 병목 현상을 방지하기 위해 Redis 기반 비동기 큐(`BRPOP`)를 통해 통신합니다.
- **프론트엔드 (React SPA)**: Vite와 TypeScript로 구축된 직관적인 대시보드와 KNHANES 80문항 설문 인터페이스 제공.
- **AWS x86_64 최적화**: Docker Buildx를 활용한 다중 아키텍처 지원 및 Ubuntu Linux 환경에서의 원활한 구동을 보장합니다.
- **자동화된 배포 파이프라인**: GitHub Actions (Self-hosted Runner)와 DuckDNS, Certbot(SSL)을 연동한 무중단 자동화 배포.

---

## 📂 프로젝트 구조

```text
.
├── ai_worker/          # AI 모델 추론 관련 코드 (MLP Worker / PyTorch)
│   ├── core/           # 워커 설정
│   ├── models/         # KNHANES 기반 모델 (`chronic_predictor.py`)
│   └── main.py         # 워커 진입점 및 Redis 큐 대기
├── app/                # FastAPI 서버 코드 (백엔드)
│   ├── apis/           # API 라우터 (인증, 예측 요청 폴링 등)
│   ├── core/           # 서버 설정
│   ├── services/       # 비즈니스 로직 및 JWT 생성
│   └── main.py         # FastAPI 애플리케이션 진입점
├── src/                # React 프론트엔드 코드 (Vite + TypeScript)
│   ├── app/            # 페이지, 컴포넌트, 라우팅 정의
│   ├── index.html      # 진입점
│   └── vite.config.ts
├── envs/               # 환경 변수 설정 파일 (.env)
├── nginx/              # Nginx 설정 파일 (리버스 프록시 및 SPA 서빙)
├── scripts/            # 배포, 인증서 갱신(Certbot), CI 쉘 스크립트
├── docker-compose.yml       # 로컬 개발용 Docker Compose 설정
├── docker-compose.prod.yml  # 운영 배포용 AWS x86_64 최적화 설정
└── pyproject.toml      # uv 기반 백엔드/AI 의존성 관리 설정
```

---

## ⚙️ 사전 준비 사항

- **백엔드/AI**: Python 3.13 이상, `uv` (패키지 매니저)
- **프론트엔드**: Node.js 20+, npm
- **인프라**: Docker & Docker-Compose

---

## 🛠️ 설치 및 설정 (로컬 환경)

### 1. 백엔드 및 AI 워커 패키지 설치
`uv`를 사용하여 가상환경을 생성하고 의존성을 설치합니다.
```bash
uv sync
```

### 2. 프론트엔드 패키지 설치
```bash
npm install
```

### 3. 환경 변수 설정
`envs/` 디렉토리에 있는 예시 파일을 참고하여 최상단에 `.env` 파일을 생성합니다. (또는 `.local.env` 활용)

---

## 🏃 실행 방법

### 로컬 환경 (Local Development)

**1. 프론트엔드 실행**
```bash
npm run dev
```

**2. 백엔드 및 AI 로컬 실행**
```bash
# FastAPI 서버
uv run uvicorn app.main:app --reload

# AI Worker
uv run python -m ai_worker.main
```

**3. 전체 스택 Docker 구동**
로컬 테스트를 위해 전체 스택(Nginx, FastAPI, AI Worker, Redis)을 구동합니다.
```bash
docker-compose up -d --build
```

### 운영 배포 환경 (Production - AWS EC2)

본 시스템은 AWS EC2 (x86_64) 환경을 타겟으로 `docker-compose.prod.yml`을 사용하여 배포됩니다.
내장된 배포 스크립트를 통해 원클릭으로 x86_64 환경에 대응할 수 있습니다.

```bash
docker-compose -f docker-compose.prod.yml up -d --build
```
> **참고**: 프로덕션 모드에서는 Redis의 외부 포트가 노출되지 않으며, SSL 자동 갱신(Certbot) 컨테이너가 함께 실행됩니다.

---

## 📝 데이터 흐름 요약

1. **사용자 진입**: Nginx를 거쳐 React SPA가 브라우저에 로드됨.
2. **인증**: 카카오/네이버 외부 OAuth 인증 수행 후 FastAPI에서 자체 JWT 토큰 발급.
3. **분석 요청**: 사용자가 작성한 설문을 FastAPI에 POST로 전송.
4. **작업 큐 대기**: FastAPI는 Redis에 데이터를 `LPUSH` 하고 `task_id`를 React로 응답.
5. **AI 추론**: AI Worker가 `BRPOP`으로 데이터를 꺼내어 모델 추론 후, 결과를 Redis에 임시(TTL) 저장.
6. **결과 시각화**: React가 `task_id`로 FastAPI에 상태를 폴링하여 결과를 받아 대시보드에 렌더링.

> **⚠️ 주의사항**: 본 서비스의 모든 출력물 및 가이드라인은 통계 및 데이터 기반의 참고용이며, 정확한 진단을 위해서는 의료 전문가와의 상담이 필수적입니다.
