# AI HealthCare System Architecture & Flow

본 문서는 현재 Amazon Web Services (AWS) EC2 기반으로 최적화된 만성질환 예측 AI 서비스의 전체 시스템 구성도 및 데이터 흐름을 정의합니다.

## 1. 프로젝트 개요 (Overview)
- **목표:** 만성질환 예측 AI 서비스 구축
- **MLP 학습 데이터:** 국민건강영양조사(KNHANES) 원시 데이터 (80개 변수 전처리)
- **MLP 추론 모델:** `chronic_predictor.py`

## 2. 기술 스택 (Tech Stack)
- **Infrastructure:** AWS EC2 m7i-flex.large (x86_64 / amd64)
- **Networking & Security:** Duck DNS, Nginx (Reverse Proxy), SSL (Certbot/ZeroSSL)
- **Auth:** OAuth 2.0 (Kakao, Naver), JWT (JSON Web Token)
- **Backend:** FastAPI, Docker, uv (Package Manager)
- **Asynchronous Task Queue:** Redis (BRPOP/Blocking Queue)
- **AI:** AI Inference Worker (MLP), Dockerized for x86_64 (amd64)
- **Frontend:** React (Vite), TypeScript
- **Testing:** Pytest, HTTPX (Unit Testing for Stateless API)
- **Deployment Tool:** GitHub Actions, Docker Buildx (Cross-compilation for ARM64)

## 3. 전체 시스템 흐름도 (System Flow)

### 3.1 사용자 여정 (User Journey)
1) **로그인 페이지 진입 (React SPA)**
   - 카카오/네이버 API 인증 후 FastAPI 서버에서 JWT 발행.
   - 회원가입 및 개인정보 수집 단계 배제 (외부 API 인증만으로 익명성 확보).
2) **서비스 선택 페이지 진입**
   - **구현 서비스:** '만성질환 예측 설문'.
3) **만성질환 예측 설문 페이지**
   - KNHANES 기반 80개 문항 설문 진행 (변수 순서 매칭: `sex`, `age`, `cfam`, `genertn`, `house`, `live_t`, `marri_1`, `fam_rela`, `tins`, `npins`, `D_1_1`, `D_2_1`, `M_2_yr`, `BH9_11`, `BH1`, `BH2_61`, `LQ4_00`, `LQ1_sb`, `LQ2_ab`, `AC1_yr`, `MH1_yr`, `MO1_wk`, `educ`, `EC1_1`, `EC_lgw_2`, `BO1`, `BO1_1`, `BO2_1`, `BD1_11`, `BD2_1`, `BD2_31`, `BD7_4`, `BD7_5`, `BA2_12`, `BA2_13`, `BA2_14`, `BP1`, `BP7`, `BS1_1`, `BS12_37`, `BS12_1`, `BS8_2`, `BS9_2`, `BS13`, `BE3_71`, `BE3_81`, `BE3_91`, `BE3_75`, `BE3_85`, `BE8_1`, `BE3_31`, `BE5_1`, `HE_fh`, `HE_ht`, `HE_wt`, `HE_wc`, `OR1`, `O_pain`, `O_ortho`, `BM1_0`, `BM7`, `BM8`, `OR1_2`, `MO4_00`, `BM14`, `E_Q_EX`, `L_BR_FQ`, `L_LN_FQ`, `L_DN_FQ`, `L_OUT_FQ`, `LS_VEG1`, `LS_VEG2`, `LS_FRUIT`, `LS_1YR`, `LK_EDU`, `LK_LB_CO`, `N_DIET`, `N_DUSUAL`, `N_WAT_C`, `LF_SAFE`).
   - 설문 완료 시 AI에 만성질환 분석 요청 가능.
4) **AI 예측 파이프라인 (만성질환 분석 진행 과정)**
   - FastAPI는 예측을 직접 수행하지 않고 Redis에 비동기로 작업 위임 (Task Queue).
   - Redis를 `BRPOP`으로 블로킹 대기하던 AI Worker가 즉시 큐에서 작업을 꺼내 처리.
   - MLP 모델 추론 후 4개 변수(`DJ8_pre(알레르기비염)`, `DI1_pre(고혈압)`, `DE1_pre(당뇨병)`, `DI2_pre(이상지질혈증)`)를 0 또는 1로 반환.
5) **대시보드 페이지 (결과 시각화)**
   - 설문 입력 수치 데이터와 MLP 추론 결과를 기반으로 화면 구성.
   - 질환 보유 예측 시 '주의' 안내 및 대응 방안 제시.
   - 입력 수치 기반 비만도 평가 및 BMI (체질량지수) 표시.

### 3.2 아키텍처 다이어그램 (Architecture Diagram)

시각적인 시스템 아키텍처 및 데이터 흐름도는 별도 분리된 [`Architecture_Diagram.md`](./Architecture_Diagram.md) 파일을 참조하십시오. 해당 다이어그램은 AWS EC2 환경, 무상태 백엔드, 비동기 AI 파이프라인 및 CI/CD 워크플로우 전반을 도식화하고 있습니다.

### 3.3 CI/CD 및 배포 파이프라인 (CI/CD Pipeline)
1) **코드 검증 (Testing & Linting)**
   - GitHub Actions 환경에서 `Ruff`를 통한 코드 린팅과 `Pytest`를 통한 단위 테스트가 자동 수행됩니다.
   - FastAPI 백엔드 및 인증 로직의 무결성을 철저히 검증한 후 다음 빌드 단계로 진행됩니다.
2) **단일 아키텍처 빌드 (Single Architecture Build)**
   - 로컬 개발 환경(x86_64)과 타겟 운영 서버(AWS EC2 x86_64) 간의 아키텍처 일치하므로 교차 컴파일 오버헤드가 제거됩니다.
   - 배포 스크립트(`deployment.sh`) 내부에서 `Docker Buildx`를 사용하여 `--platform linux/amd64` 기반의 이미지를 안전하게 빌드하고 Docker Hub에 푸시합니다.
3) **운영 서버 배포 (Deployment)**
   - 빌드된 최신 이미지를 AWS EC2 인스턴스에서 `docker compose` 명령어로 pull 받아, 무상태(Stateless) 기반의 무중단 아키텍처 형태로 컨테이너를 재실행합니다.