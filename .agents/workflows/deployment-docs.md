---
description: # [Workflow] OCI 인프라 배포 가이드 문서화 파이프라인
---

## 1. 개요 (Overview)
본 워크플로우는 현재 프로젝트의 코드베이스와 인프라 설정 상태를 분석하여, Amazon Web Services (AWS) 환경에 배포하기 위한 최신화된 가이드 문서(DEPLOYMENT_GUIDE_AWS.md)를 자동 생성 및 업데이트하는 절차를 정의한다.

## 2. 사전 제약 조건 (Pre-flight Constraints)
* **목표 환경 (Target Environment):** AWS EC2 m7i-flex.large (x86_64 / amd64) 인스턴스 (Ubuntu OS 권장).
* **출력 포맷 (Output Format):** Markdown (`.md`).
* **문서 대상 파일:** 프로젝트 루트 디렉토리의 DEPLOYMENT_GUIDE_AWS.md.
* **독립 실행 (Standalone Execution):** 본 워크플로우는 코드 구현 로직과 격리되어, 오직 배포 가이드 작성 및 인프라 검증 목적만을 위해 실행된다.

## 3. 실행 파이프라인 (Execution Pipeline)

### Step 1: 인프라 컨텍스트 스캔 (Infrastructure Context Scan)
1. 프로젝트 내의 다음 설정 파일들을 스캔하여 현재 상태를 파악한다.
   * `docker-compose.yml` (단일 플랫폼 x86_64 빌드 및 컨테이너 구성)
   * `nginx.conf` (Duck DNS 라우팅 및 SSL 프록시 설정)
   * `.github/workflows/` 내의 CI/CD 파이프라인 설정 (Self-hosted Runner 기반)
   * `Dockerfile` (Python 패키지 매니저 `uv` 사용 여부 및 ARM64 호환성)

### Step 2: 배포 가이드 문서 구조화 (Documentation Structuring)
스캔한 정보를 바탕으로 DEPLOYMENT_GUIDE_AWS.md 파일에 다음 항목이 반드시 포함되도록 목차와 내용을 구성한다.
1. **AWS EC2 초기화 (Initialization):** EC2 인스턴스 프로비저닝 가이드, VPC 보안 그룹(Security Group) 인바운드 규칙(80, 443, 22 포트) 개방 및 OS 레벨 방화벽 설정 스크립트(init.sh 등).
2. **비용 및 리소스 최적화 (Cost & Resource Optimization):** 제한된 8GB 메모리 환경에서 OOM(Out of Memory) 방지를 위한 Swap 메모리 설정 스크립트 및 docker-compose 메모리 제한(Limit) 가이드. AWS Budgets 알림 설정 안내.
3. **DNS 및 SSL 설정:** Duck DNS 연동 스크립트(crontab) 및 Certbot/ZeroSSL 인증서 발급 프로세스(동적 IP 매핑 유지).
4. **CI/CD 파이프라인 연동:** GitHub Actions Self-hosted Runner를 EC2 인스턴스에 설치하고 백그라운드(systemd 서비스)로 실행하는 방법.
5. **빌드 및 배포 최적화:** uv를 활용한 패키지 설치 최적화 및 Docker Buildx를 통한 linux/arm64 단일 아키텍처 이미지 빌드, Dangling Images 정리(docker image prune) 명령어.

### Step 3: 트러블슈팅 가이드 추가 (Troubleshooting Guide)
* 인스턴스 다운/먹통 현상: OOM(Out of Memory) 킬러 작동 확인 및 컨테이너 메모리 튜닝 방법.
* 외부 접속 불가: AWS 보안 그룹(Security Group) 및 OS 방화벽(UFW) 교차 점검.
* Nginx 502 Bad Gateway 발생 시 네트워크 브릿지 확인 방법.
* Redis 연결 실패 (Connection Refused) 시 점검 사항.
* 권한 문제(Permission Denied) 및 환경 변수(.env) 누락 및 AWS 플랫폼(exec format error) 아키텍처 불일치 에러 대처 방법.

### Step 4: 산출물 반영 및 로그 기록 (Artifact Update & Logging)
1. 생성 혹은 수정된 내용을 DEPLOYMENT_GUIDE_AWS.md에 덮어쓴다.
2. ./vibe_log.md 파일 최하단에 [배포 가이드 최신화] 내역을 기록한다. (시간, 변경된 파일, 핵심 변경 사항 명시)