# TODO IMPROVEMENTS (코드 개선 및 점검 로드맵)

본 문서는 유동 IP 기반의 DDNS(Duck DNS) 환경 배포 시 발생할 수 있는 잠재적 장애 요인을 제거하고, 향후 안정적인 프로덕션 운영을 위해 개선해야 할 코드 및 인프라 수정 방향성을 정리한 백로그 리스트입니다.

> **범례**: ✅ 코드 반영 완료 | ⏳ 배포 대기 중 (코드 반영됨, 서버 미적용) | 🔲 미시작

---

## 1. 코드 및 인프라 개선 사항 (Refactoring Roadmap)

### ✅ [CORS & 라우팅] Nginx 수준의 IP 직접 접속 제한
* **현상**: IP 주소가 변경되었을 때 도메인이 아닌 IP 주소로 직접 진입 시 CORS 차단으로 서비스가 정상 동작하지 않음.
* **개선 방향**: Nginx 환경설정을 수정하여 IP 주소 형식의 요청은 즉시 유효한 Duck DNS 도메인으로 301 리다이렉트 처리함.
* **수정 파일**: [nginx/prod_https.conf](file:///d:/07_AWS/nginx/prod_https.conf)
* **반영 내용**:
  - HTTP(80) 요청의 리다이렉트 대상을 `$host` 대신 도메인 고정값(`chronicconditioncheck.duckdns.org`)으로 변경하여 IP 접속 시에도 도메인으로 유도
  - HTTPS(443) server 블록 최상단에 `$host` 정규식 IP 매칭 시 도메인으로 301 리다이렉트하는 `if` 블록 추가
* **배포 필요**: ⏳ `deployment.sh` 재실행 또는 `nginx/prod_https.conf` → EC2 수동 복사 후 `docker compose restart nginx`

---

### ✅ [인증 보안] CSRF State 토큰 Redis TTL 연장
* **현상**: IP 변경에 따른 DNS 갱신/전파 지연 시간이 5분을 초과할 경우, 네이버 로그인 중간 단계에서 Redis `state` 키가 만료되어 `HTTP 400` 오류가 발생함.
* **개선 방향**: Redis 적재 시 토큰의 생존 기간을 30분(1800초)으로 상향하여 네트워크 전파 지연 마진 확보.
* **수정 파일**: [auth_routers.py](file:///d:/07_AWS/app/apis/v1/auth_routers.py#L162)
* **반영 내용**: `setex` TTL을 기존 `300`초(5분)에서 `1800`초(30분)로 변경 완료
* **배포 필요**: ⏳ FastAPI Docker 이미지 재빌드 및 Docker Hub 푸시 → EC2 컨테이너 갱신

---

### ✅ [SSL 인증서] DNS-01 챌린지 갱신 프로세스 도입
* **현상**: HTTP-01 검증 방식을 쓰면 IP 변경 도중에 Let's Encrypt 갱신 주기가 겹칠 때 도메인 소유권 검증 실패로 SSL 인증서가 만료됨.
* **개선 방향**: 서버 포트 접속이 필요 없는 DNS-01 챌린지로 전환하여 백그라운드에서 상시 안전하게 인증서가 자동 갱신되도록 함.
* **수정 파일**: [scripts/certbot.sh](file:///d:/07_AWS/scripts/certbot.sh), [docker-compose.prod.yml](file:///d:/07_AWS/docker-compose.prod.yml), [envs/example.prod.env](file:///d:/07_AWS/envs/example.prod.env)
* **반영 내용**:
  - `certbot/certbot` 컨테이너 진입점에서 `pip install certbot-dns-duckdns` 후 `--authenticator dns-duckdns` 방식으로 갱신
  - `certbot.sh` 초기 발급 흐름을 DNS-01로 전환: Duck DNS API Token(`DUCKDNS_TOKEN`)을 `duckdns.ini` 파일로 certbot-conf 볼륨에 주입
  - `DUCKDNS_TOKEN` 환경 변수 항목을 `envs/example.prod.env`에 추가
  - `sed` 치환 후 원본 복원 로직 추가 (반복 실행 시 기준 도메인 소실 버그 수정)
* **배포 필요**: ⏳ `certbot.sh` 재실행 (DNS-01 방식으로 신규 인증서 발급) + `docker-compose.prod.yml` → EC2 갱신 후 certbot 컨테이너 재기동
* **사전 조건**: `envs/.prod.env`에 `DUCKDNS_TOKEN=실제값` 기입 필요

---

### ✅ [CI/CD 배포] GitHub Actions Self-hosted Runner CD 파이프라인 구성
* **현상**: IP가 동적으로 변경되면 GitHub Actions가 EC2로 직접 SSH 배포 명령을 보낼 때 타임아웃 배포 실패가 일어남.
* **개선 방향**: 외부 SSH 접속 방식을 배제하고, EC2 내부에서 구동되는 에이전트 기반 풀(Pull) 배포 모델을 단일화함.
* **수정 파일**: [.github/workflows/deploy.yml](file:///d:/07_AWS/.github/workflows/deploy.yml), [DEPLOYMENT_GUIDE.md](file:///d:/07_AWS/DEPLOYMENT_GUIDE.md)
* **반영 내용**:
  - `main` 브랜치 push 시 GitHub 호스티드 러너에서 프론트엔드 빌드 및 Docker 이미지 빌드+푸시를 수행
  - EC2 내 `self-hosted` 러너가 빌드 결과를 pull 하여 컨테이너 배포 수행
  - 배포 환경 변수(`.env`)를 `PROD_ENV_FILE` GitHub Secret으로 주입하는 방식 채택
  - `DEPLOYMENT_GUIDE.md` § 10에 러너 등록 절차 및 필요 Secret 목록 문서화
* **배포 필요**: 🔲 **서버에서 self-hosted runner 서비스를 먼저 등록해야 활성화됨**
  - 상세 절차: [DEPLOYMENT_GUIDE.md § 10](file:///d:/07_AWS/DEPLOYMENT_GUIDE.md) 참조
  - GitHub Secrets 등록 필수 항목: `DOCKER_USERNAME`, `DOCKER_PASSWORD`, `DOCKER_REPOSITORY`, `PROD_ENV_FILE`

---

### ✅ [테스트] CORS ALLOWED_ORIGINS 환경 변수 유효성 자동 검증
* **현상**: `ALLOWED_ORIGINS` 환경 변수 오설정(trailing slash 포함, 잘못된 포맷 등)으로 인한 CORS 차단 오류가 배포 후에야 발견됨.
* **개선 방향**: Pytest로 CORS 설정 형식 및 프로덕션 도메인 정합성을 자동 검증하도록 테스트 코드 추가.
* **수정 파일**: [app/tests/test_cors.py](file:///d:/07_AWS/app/tests/test_cors.py) (신규 생성)
* **반영 내용**: 총 2개 테스트 케이스 추가, 로컬 `uv run pytest app` 통과 확인 (16/16 passed)

---

## 2. 코드 상시 점검 가이드라인 (Code Inspection Guide)

* **쿠키 속성 조건부 검증**:
  - `secure=config.ENV == "prod"` 옵션이 적용되어 있을 때 HTTPS 적용 중단 상황(인증서 만료 등)이 생기면 쿠키 송수신이 원천 차단되므로, 로컬 환경(`local`)과 프로덕션 환경(`prod`)에서의 쿠키 동작 유효성 테스트를 매 배포 전 필수 수행해야 합니다.
* **Redis 연결 커넥션 생명주기 검증**:
  - FastAPI의 글로벌 예외 핸들러가 Redis 커넥션 타임아웃이나 세션 유실 상황에서 `HTTP 503 Service Unavailable`을 제대로 반환하고 프론트엔드가 이를 인지하여 로그인 세션 만료 알림을 정상 제공하는지 점검합니다.
* **환경 변수 일관성 유지**:
  - `ALLOWED_ORIGINS` CORS 리스트 설정 시 포트 번호(`:3000`, `:5173`)와 프로토콜(`http://`, `https://`) 명시 규칙이 `.env` 파일과 백엔드 `config.py` 파일 간 일치하는지 전수 대조합니다.

---

## 3. 리팩토링 체크리스트 (배포 적용 여부 기준)

- [x] [Nginx] IP 직접 접속 감지 시 도메인 주소 자동 리다이렉트 설정 반영 → ⏳ EC2 Nginx 재기동 필요
- [x] [FastAPI] 네이버 OAuth CSRF 토큰 Redis TTL 30분(1800s)으로 수정 → ⏳ FastAPI 이미지 재빌드 및 배포 필요
- [x] [Certbot] Duck DNS API 연동 기반 DNS-01 챌린지 갱신 코드로 전환 → ⏳ `certbot.sh` 재실행 필요
- [x] [CI/CD] GitHub Actions Self-hosted Runner CD 워크플로우 `.github/workflows/deploy.yml` 신설 → 🔲 EC2 runner 서비스 등록 필요
- [x] [CORS] ALLOWED_ORIGINS 환경 변수 유효성 검증 자동 테스트 코드 추가 → ✅ 로컬 검증 완료
- [ ] [FastAPI] HTTPS 예외적 비활성화 시를 대비한 secure 쿠키 유연화 예외 처리 구현 → 🔲 미시작


---

