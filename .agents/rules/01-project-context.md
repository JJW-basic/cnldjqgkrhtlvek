---
trigger: always_on
---

# Background & Context
1. Goal: 만성질환(알레르기비염, 고혈압, 당뇨병, 이상지질혈증) 예측 및 생활 개선 가이드라인을 제안하는 AI 서비스 구축
2. Working Environment: Local Windows OS ('Anti-gravity' IDE 기반 Vibe Coding) -> Target: AWS EC2 m7i-flex.large (x86_64), Ubuntu Linux
3. Project Evolution Roadmap:
	- Phase 1 (CURRENT): DB-less 기반 웹 서비스 배포 (Stateless, Redis 기반 상태 및 큐 관리)
	- Phase 2 (Future): RDBMS 통합을 통한 서비스 안정성 및 영구적 상태 관리 확보
	- Phase 3 (Future): 데이터 기반 AI 자문 기능(Data-Driven AI Advisory) 도입 및 사용자 편의성 확장
4. Input Data: 의료기기 없이 가정에서 수집 가능한 KNHANES(국민건강영양조사) 기반 80개 변수 데이터 (키, 몸무게, BMI, 생활습관 역학 데이터 등)
5. Output Format: 질환별 위험도(0~100%), 위험 등급(저/중/고), 행동 지침이 포함된 생활 개선 가이드라인
6. Disclaimer: 모든 출력물 및 UI에 "본 결과는 참고용이며, 정확한 진단은 의료 전문가에게 문의하십시오." 사전 고지 필수

# Architecture & Tech Stack
1. Infrastructure & CI/CD:
	- AWS EC2 m7i-flex.large (x86_64 / amd64, 2vCPU, 8GiB RAM)
	- Duck DNS, Nginx (Reverse Proxy), SSL (Certbot/ZeroSSL)
	- GitHub Actions (Self-hosted Runner)
	- Docker / Docker Buildx (Target Platform: linux/amd64 단일 아키텍처 강제)
2. Backend & Task Management:
	- FastAPI, uv (Package Manager)
	- Redis (BRPOP/Blocking Queue) - 비동기 작업 큐 및 JWT 블랙리스트(TTL) 관리 전용
3. AI Inference:
	- AI Worker (MLP - Multilayer Perceptron), x86_64(amd64) 최적화 컨테이너
4. Frontend:
	- React (Vite) + TypeScript (SPA)

# Authentication & Extreme Privacy Directives
1. Auth Provider: 카카오(Kakao), 네이버(Naver) OAuth 2.0 전용
2. Zero PII (Absolute Anonymity): 이름, 나이, 전화번호, 이메일 등 식별 가능한 개인정보(PII)의 수집, 요청, 데이터 모델링 절대 금지
3. Token Flow: 외부 API 인증 후 제공되는 Opaque Provider ID만 추출하여 내부 JWT 발행 (익명성 완벽 확보)
4. Redis Scope: TTL 기반 JWT 블랙리스트 및 CSRF State 토큰 보관만 허용. TTL 범위를 벗어난 영구적 세션 데이터 저장 금지

# System Integration & Workflow
1. Routing (Nginx): Nginx를 단일 진입점으로 설정 (정적 자산 -> React, `/api/*` -> FastAPI 라우팅)
2. Asynchronous Decoupling (FastAPI ↔ AI Worker): 
	- FastAPI는 딥러닝 추론 시 대기(Blocking) 금지
	- 모든 추론 작업은 Redis Task Queue로 전달 후 즉시 클라이언트에 Task ID 반환 (Client Polling 또는 Subscription 구조)
3. Error Handling Strategy:
	- FastAPI: HTTP 4xx, 5xx, Validation 에러에 대한 전역 예외 처리기(Global Exception Handler) 구현 및 구조화된 JSON 반환
	- Redis: 연결 실패 대비 Fallback/Circuit Breaker 패턴 적용 (침묵 실패 방지 및 HTTP 503 명확히 반환)
	- ML Worker: 추론 작업에 대한 Timeout 정책 수립. 초과 시 클라이언트에 Graceful Error 반환

# System Directives & Reasoning Principles
1. Architecture-First Reasoning (아키텍처 최우선 추론)
	- 모든 문제 해결 시 고가용성(High Availability)과 무상태(Stateless) 분산 시스템 구조를 최우선으로 고려한다.
	- 기능 구현 전, 해당 로직이 OCI Ampere A1 (ARM64) 환경 및 멀티 플랫폼 Docker 빌드에서 정상 동작하는지 교차 검증한다.
2. Asynchronous & Non-blocking (비동기 및 논블로킹 강제)
	- FastAPI와 AI Worker 간의 결합도를 낮추고 병목 현상을 방지하기 위해, 모든 추론 작업은 Redis 기반 비동기 큐(Task Queue)를 통해서만 처리하도록 강제한다. 메인 스레드에서 무거운 연산을 수행하는 코드는 작성하지 않는다.
3. Strict Data Handling (엄격한 데이터 처리)
	- KNHANES와 같은 정형 데이터(Tabular Data)를 다룰 때는 입력값의 타입(Type), 범위(Range), 결측치(Missing Values)에 대한 방어적 프로그래밍(Defensive Programming)과 꼼꼼한 피처 매핑(Feature Mapping)을 수행한다.
4. Fail-Safe & Observability (장애 대비 및 가시성)
	- 시스템의 한 지점(예: Redis 연결 끊김, 외부 API 타임아웃)이 실패하더라도 전체 서비스가 중단되지 않도록 Fallback 패턴 및 명확한 에러 코드(HTTP 5xx, 4xx)를 반환하는 로직을 기본으로 탑재한다.
5. User-Centric Transparency (사용자 중심 투명성)
	- 클라이언트(프론트엔드)로 반환되는 모든 결과 메시지 및 가이드라인은 데이터에 기반하여 직관적으로 작성하며, 의료적 진단을 대체할 수 없다는 한계를 명확히 내포하도록 구조화한다.
6. Cost-Aware Engineering (비용 인지 엔지니어링)
	- 한정된 AWS 프로모션 크레딧 내에서 운영됨을 인지하고, 단일 m7i-flex.large 인스턴스(메모리 8GB)에서 Nginx, React, FastAPI, Redis, AI Worker 컨테이너가 모두 안정적으로 동작할 수 있도록 각 컨테이너의 메모리 제한(Memory Limits) 및 경량화를 최우선으로 설계한다.

# Task Orchestration
1. Task Decomposition & Mapping: 
	- 요청사항 분석 후 Architecture 영역(React, FastAPI, Nginx, Redis 등)별 최소 작업 단위로 분해
	- 분해된 단위가 'Zero PII' 원칙에 위배되지 않는지 철저히 사전 검증
2. Logic Design & Draft: 
	- Stateless, 비동기, 다중 아키텍처 호환, 비용 효율화 지침을 준수하는 엔지니어링 해결책 초안 설계

# Logging Protocol
1. 모든 작업 완료 또는 변경 시 `./vibe_log.md` 업데이트 (파일 부재 시 즉시 생성).
2. 기존 내용 보존 및 최하단에 새 로그 추가.
3. 모든 시간은 한국 표준시(KST) 기준 기록.
4. 파일 로그 양식:
	## [YYYY-MM-DD HH:mm KST] - (성공✅/주의⚠️/오류❌) 작업 요약
	* **변경된 파일:** `파일명1`, `파일명2` (변경 없으면 `없음`)
	* **핵심 변경 사항:**
		- [논리]: 수정 원인 및 적용한 엔지니어링 논리
		- [기능]: 추가/수정/삭제된 구체적 기능 변화
	* **결과 확인:** 테스트 수행 결과, 작동 여부, 발견된 이슈
	* **참고:** PR 링크, 이슈 번호, 추가 설명