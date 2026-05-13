# 만성질환 예측 AI 서비스 구조 및 흐름 분석

## 1. 프로젝트 아키텍처 원칙: 근본 원인 - 해결 방안 - 재발 방지
- **근본 원인 (Root Cause):** 머신러닝(MLP) 추론 작업은 CPU 및 메모리 리소스를 점유하여 단일 웹 서버(FastAPI)가 요청을 동기식으로 처리할 경우 병목 현상(Bottleneck)이 발생하고 다수 사용자의 접근이 제한됨.
- **해결 방안 (Resolution):** Redis를 기반으로 한 Task Queue와 비동기 AI Worker 컨테이너를 도입. FastAPI는 요청 접수 후 즉시 Task ID를 반환하고, 실제 연산은 AI Worker가 백그라운드에서 처리(BRPOP 대기)하도록 책임을 분리.
- **재발 방지 (Prevention):** Docker Compose 기반의 MSA(Microservices Architecture)로 분리 구축하여, 추론 수요 급증 시 AI Worker 컨테이너만 개별적으로 스케일 아웃(Scale-out)할 수 있는 구조적 대비책 마련.

## 2. 전체 프로젝트 구조 (Project Components)
본 프로젝트는 Oracle Cloud Infrastructure (OCI) Ampere A1 (ARM64) 상에서 구동되며, 4개의 핵심 컨테이너로 구성되어 있습니다.

1. **Nginx & Frontend (React SPA)**
   - **역할:** 사용자의 HTTPS 트래픽을 최초로 받아 React 정적 파일(Vite 빌드 결과물)을 서빙하고, `/api` 경로를 FastAPI로 포워딩하는 리버스 프록시(Reverse Proxy).
   - **특징:** SSL 인증서 적용(Certbot) 및 클라이언트 레벨의 3중 라우트 가드(GuestRoute, ProtectedLayout 등) 구현.

2. **Backend (FastAPI)**
   - **역할:** 클라이언트 요청 처리, OAuth 2.0 (Kakao, Naver) 콜백 및 JWT 토큰 관리, AI 분석 요청 중계.
   - **특징:** MySQL 등 RDBMS를 완전히 제거한 Stateless(무상태) 구조이며, 외부 인증만을 사용해 개인정보 수집을 원천 배제함.

3. **Task Queue (Redis)**
   - **역할:** FastAPI와 AI Worker 간의 통신 브로커이자 캐시 데이터베이스.
   - **특징:** Docker 내부 네트워크(`ws`)에 격리되어 보안을 확보하며, 비동기 작업 큐 및 OAuth state 값 임시 저장 용도로 활용.

4. **AI Worker (Python / PyTorch)**
   - **역할:** Redis 큐를 `BRPOP`으로 대기하다 작업이 인입되면 국민건강영양조사(KNHANES) 모델을 바탕으로 만성질환 추론 수행.
   - **특징:** ARM64 환경에 맞춰 최적화된 Docker 이미지로, FastAPI와 독립적으로 동작. 추론 결과를 Redis에 TTL을 주어 임시 저장함.

5. **CI/CD & Deployment Infrastructure**
   - **역할:** 로컬 x86_64 개발 환경과 프로덕션 OCI ARM64 환경 간의 아키텍처 불일치를 극복하고 테스트/배포를 자동화.
   - **특징:** GitHub Actions 기반의 린팅(Ruff) 및 로직 단위 테스트(Pytest) 파이프라인, `Docker Buildx`를 활용한 `--platform linux/arm64` 교차 컴파일(Cross-compilation) 스크립트화 적용.

## 3. 데이터 흐름 (Data Flow Sequence)

### 3.1. 사용자 인증 흐름 (OAuth)
1. **[React]** 카카오/네이버 로그인 버튼 클릭.
2. **[FastAPI]** OAuth Provider(카카오/네이버) 서버로 307 리다이렉트 처리.
3. **[OAuth]** 사용자 동의 완료 후 인가 코드(Auth Code)와 함께 FastAPI의 Callback URL로 반환.
4. **[FastAPI]** 인가 코드를 토큰으로 교환하여 사용자 ID 및 본인인증(is_certified) 여부 확인 후 자체 JWT 발급.
5. **[React]** 클라이언트 SessionStorage에 발급된 토큰 저장.

### 3.2. AI 모델 추론 흐름 (Asynchronous Prediction)
1. **[React]** 사용자가 KNHANES 기준 80개 문항 데이터를 입력하여 POST 요청 전송.
2. **[FastAPI]** 요청 수신 시 JWT 유효성 검증 후, Redis 큐에 해당 데이터를 밀어넣고(LPUSH) 생성된 `task_id`를 React로 즉시 응답.
3. **[AI Worker]** Redis 큐를 블로킹 대기(BRPOP)하다가 데이터를 꺼내어 KNHANES 데이터 전처리 및 MLP 모델(4가지 만성질환) 추론 실행.
4. **[AI Worker]** 추론 결과를 Redis에 `<task_id>:result` 형태로 저장.
5. **[React]** 발급받은 `task_id`를 사용하여 1초 단위로 FastAPI에 결과 확인 폴링(Polling) 요청.
6. **[FastAPI]** Redis에 결과값이 있으면 꺼내어 React에 반환하고, 대시보드 페이지에 결과를 시각화.

## 4. 5대 핵심 관점 평가 (5 Perspectives Analysis)

*   **가용성(Availability):** AI Worker에 장애가 발생하여도 Redis 큐에 작업 지시가 보존됩니다. 컨테이너가 복구되면 큐에 쌓인 요청을 재개하므로 메시지 유실 없는 고가용성을 보장합니다.
*   **확장성(Scalability):** 백엔드가 상태(DB)를 가지지 않는 Stateless 아키텍처이므로 트래픽 급증 시 무중단 확장이 유리합니다.
*   **보안성(Security):** Redis를 외부로 노출하지 않아 침투 경로를 차단했습니다. 개인정보(주민번호 등)를 저장하지 않고 OAuth 본인인증 검증 플래그와 JWT만을 사용하므로 데이터 유출 타격을 최소화했습니다.
*   **유지보수성 및 배포 안정성(Maintainability & Deployment Stability):** 개발 환경(x86_64)과 배포 환경(ARM64)의 아키텍처 차이로 인한 실행 오류(Exec Format Error)를 방지하기 위해 `Docker Buildx`를 스크립트에 통합하여 교차 컴파일을 강제합니다. 또한, No-DB 환경에서도 핵심 인증 및 예측 로직의 무결성을 보장하기 위해 `Pytest` 기반 단위 테스트를 구축하여 CI 파이프라인과 연동했습니다.
*   **윤리적 편향성(Ethical Bias):** KNHANES 원시데이터 자체가 특정 연령대(고령층)나 특정 사회경제적 지위를 가진 집단의 표본 비중이 다를 수 있으므로, 모델 추론 시 이로 인한 특정 집단 편향성이 발생할 수 있음을 인지하고 사용자의 피드백을 지속적으로 수집해야 합니다.
*   **인지적 개방성(Cognitive Openness):** '만성질환 결과'라는 무거운 의료 데이터를 단순히 확률로만 제공하기보다, AI 결과를 응용한 '생활습관 개선 챌린지'나 요리/운동 등을 접목하는 게이미피케이션(Gamification) 방식을 향후 서비스에 녹여내어 사용자의 심리적 장벽을 파격적으로 완화할 것을 권장합니다.
