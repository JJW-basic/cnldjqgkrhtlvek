---
description: # [Workflow] 만성질환 예측 AI 서비스 구현 파이프라인 (Phase 1)
---

## 1. 개요 (Overview)
본 워크플로우는 안티 그래비티(Anti-gravity) 환경에서 AWS EC2 (x86_64) 기반 만성질환 예측 웹 서비스(DB-less)를 구축하기 위한 표준 작업 절차를 정의한다. AI 에이전트는 사용자의 요청을 수신할 때마다 아래의 단계를 엄격히 순차적으로 실행해야 한다.

## 2. 사전 제약 조건 (Pre-flight Constraints)
* **패키지 관리 (Package Management):** Python 의존성 설치 및 환경 구성은 반드시 `uv`를 사용한다.
* **아키텍처 호환성 (Architecture Compatibility):** AWS EC2 m7i-flex.large (x86_64) 배포를 전제로 하며, Dockerfile 작성 및 CI/CD 파이프라인 구성 시 linux/amd64 단일 플랫폼 빌드를 강제한다.
* **극단적 개인정보 보호 (Zero PII):** 모든 설계 및 구현 단계에서 이름, 나이, 연락처 등 식별 가능한 개인정보 수집/저장 로직을 배제한다.
* **구조적 시각화 (Structural Visualization):** 시스템 아키텍처 및 비동기 워크플로우 설명이 필요할 경우, `Mermaid.js`를 활용하여 시각적 다이어그램을 생성한다.

## 3. 실행 파이프라인 (Execution Pipeline)

### Step 1: 컨텍스트 로드 및 작업 세분화 (Context Loading & Decomposition)
1.  `.agents/skills/project_memory/` 경로에 존재하는 도메인별(Infra, Backend, Model) 컨텍스트를 리딩한다.
2.  사용자의 현재 요청을 분석하여 프론트엔드(React), 게이트웨이(Nginx), 백엔드(FastAPI), 캐시(Redis), 추론 워커(AI Worker) 중 어느 영역에 해당하는지 식별한다.
3.  요청을 최소 구현 단위로 분해하고, 각 단위가 Zero PII 원칙에 위배되지 않는지 검증한다.

### Step 2: 비동기 논리 설계 (Asynchronous Logic Design)
1.  **DB-less 상태 관리:** 인증 상태는 OAuth(카카오/네이버) 기반의 JWT Payload와 Redis TTL을 조합하여 검증 로직을 설계한다.
2.  **작업 큐잉 (Task Queuing):** 딥러닝 추론(KNHANES 80개 변수 기반 MLP) 작업은 FastAPI에서 직접 처리하지 않고, Redis `BRPOP` 블로킹 큐를 활용하여 AI Worker로 이관하는 논리를 구성한다.
3.  설계된 논리를 바탕으로 코드 초안을 작성한다.

### Step 3: 코드 구현 및 리뷰 (Implementation & Self-Review)
1.  선택된 기술 스택(FastAPI, React+TS, Docker 등)에 맞춰 코드를 생성한다.
2.  예외 처리 전략을 점검한다 (예: Redis 연결 실패 시 503 에러 반환, 추론 시간 초과 시 Graceful Error 처리).
3.  코드가 AWS EC2 Linux(x86_64/amd64)와 로컬 Windows 환경 모두에서 호환되는지 교차 검증한다.

### Step 4: 산출물 반영 및 로그 기록 (Artifact Update & Logging)
1.  모든 코드 구현 및 파일 변경이 완료되면 `./vibe_log.md` 파일을 최신화한다.
2.  로그 작성 시 한국 표준시(KST)를 기준으로 시간, 변경된 파일, 핵심 변경 사항(논리/기능), 결과 확인 항목을 명시한다.