# Oracle Cloud 및 Duck DNS 마이그레이션 가이드

이 문서에서는 기존 **AWS EC2 + 타 도메인(Godaddy, Route53 등)** 환경에서 **Oracle Cloud Infrastructure (OCI) + Duck DNS** 환경으로 전환할 때 발생할 수 있는 문제점과 반드시 변경해야 할 세부 사항들을 정리합니다. 향후 오라클 클라우드로 전환 시 참고하여 프로젝트 파일과 프롬프트를 수정하시기 바랍니다.


## 2. 배포 스크립트 (`scripts/deployment.sh`) 수정
오라클 무료 인스턴스와 AWS EC2의 근본적인 하드웨어 설계 차이(ARM vs AMD)를 반영해야 합니다.

### 2.1 도커 빌드 아키텍처 하드코딩 제거 (🚨 가장 중요)
- 오라클 클라우드의 가장 스펙이 좋은 'Always Free' 인스턴스는 Ampere A1, 즉 **ARM 아키텍처(aarch64)**입니다.
- **[수정 사항]** `Line 28`의 도커 빌드 명령어에서 `--platform linux/amd64` 부분을 지우거나, 동적으로 플랫폼을 감지하여 빌드하도록(`linux/arm64`) 스크립트를 재작성해야 호환성 문제가 발생하지 않습니다.
  ```bash
  # 기존
  docker build --platform linux/amd64 -t ...
  # 변경 후 (제거하여 호스트 아키텍처를 따르도록)
  docker build -t ...
  ```

### 2.2 EC2 명칭 및 접속 계정 범용화
- 프롬프트에 하드코딩된 'EC2' 텍스트를 모두 `Oracle Instance` 혹은 `VM`으로 번경합니다.
- (참고) AWS 우분투 이미지는 기본 접속 유저명이 `ubuntu`이지만, 오라클 우분투 역시 일반적으로 `ubuntu`를 사용합니다. 단, 오라클 리눅스(Oracle Linux)를 선택할 경우 `opc` 유저를 사용하므로, 스크립트 작성 시 주의가 필요합니다.

---

## 3. 오라클 클라우드 전용 인프라 및 방화벽 설정

AWS 환경에서는 대시보드(Security Group)에서 포트를 열면 끝이지만, Oracle Cloud는 대시보드 설정(VCN) 이외에도 **OS 내부 방화벽**이 막혀있어 매우 높은 확률로 Nginx(웹) 접근이 불가능합니다.

### 3.1 OS 단계 iptables 80/443 포트 개방 스크립트 추가
- OCI 인스턴스는 기본적으로 `iptables` 규칙이 설정되어 22번 포트 제외 모든 인바운드가 막혀 있습니다. 배포 스크립트나 가이드 문서(`DEPLOYMENT_GUIDE.md`)에 서버 초기 세팅 명령어 리스트를 추가해야 합니다.
- **[추가해야 할 서버 세팅 명령어 예시]**:
  ```bash
  sudo iptables -I INPUT -p tcp -m tcp --dport 80 -j ACCEPT
  sudo iptables -I INPUT -p tcp -m tcp --dport 443 -j ACCEPT
  sudo netfilter-persistent save
  ```

---

## 4. 도메인 (Duck DNS) & 인증서 (`scripts/certbot.sh`) 이슈

무료 도메인인 Duck DNS를 사용할 경우, SSL 자동화 쉘 스크립트 방식에 제약이 생길 수 있습니다.

### 4.1 Certbot 챌린지 제약 (HTTP-01)
- 스크립트의 현재 방식(`--webroot`)인 `HTTP-01` 챌린지는 서브도메인이 지정된 단일 주소(`예: health.duckdns.org`)에서는 매우 잘 동작합니다.
- 단, 사용자가 `*.health.duckdns.org` 형태의 **와일드카드(Wildcard) 인증서 발급**을 원할 경우 HTTP 방식으로는 발급이 거부됩니다.
- **[대응 방안]** 와일드카드 인증서가 필요하다면 DNS-01 챌린지를 써야 하나, Duck DNS 전용 스크립트 플러그인을 도입해야 하므로 구성이 복잡해집니다. 따라서 Duck DNS 전환 시 단일 도메인 사용을 강력히 권장하는 내용을 가이드라인에 명시해야 합니다.

### 4.2 오라클 IP와 Duck DNS 매핑 시점 명시
- 인증서 발급 스크립트(`certbot.sh`)를 실행하기 "전"에, 반드시 Oracle Cloud의 고정 IP(Reserved Public IP)를 발급받아 Duck DNS 사이트 설정에 매핑해 두어야만 Nginx ACME 챌린지 오류가 발생하지 않는다는 사실을 `DEPLOYMENT_GUIDE.md` 문서 내 인증서 발급 조건 부분에 분명히 기재합니다.
