#!/bin/bash
set -eo pipefail

COLOR_GREEN=$(tput setaf 2)
COLOR_BLUE=$(tput setaf 4)
COLOR_RED=$(tput setaf 1)
COLOR_NC=$(tput sgr0)

cd "$(dirname "$0")/.."
source ./envs/.prod.env

echo "${COLOR_BLUE}Start CERT Domain with Certbot.."

# ---------- Input Prompt ----------
echo "${COLOR_BLUE}SSL 인증서를 발급받을 도메인을 입력하세요.${COLOR_NC}"
read -p "도메인 주소: " domain
domain=$(echo "$domain" | tr -d '\r')
echo ""
echo "${COLOR_BLUE}SSL 인증서를 발급에 사용할 이메일을 입력하세요.${COLOR_NC}"
read -p "이메일: " email
email=$(echo "$email" | tr -d '\r')
echo ""

# Read DUCKDNS_TOKEN from env or prompt
if [ -z "${DUCKDNS_TOKEN}" ] || [ "${DUCKDNS_TOKEN}" = "your-duckdns-token" ]; then
    echo "${COLOR_BLUE}Duck DNS API Token을 입력하세요.${COLOR_NC}"
    read -p "Duck DNS Token: " DUCKDNS_TOKEN
    DUCKDNS_TOKEN=$(echo "$DUCKDNS_TOKEN" | tr -d '\r')
    echo ""
fi

echo "${COLOR_BLUE}AWS EC2 인스턴스 생성시 발급받은 ssh key 파일의 파일명을 입력하세요.(ex. ai_health_key.pem)${COLOR_NC}"
read -p "SSH 키 파일명: " ssh_key_file
ssh_key_file=$(echo "$ssh_key_file" | tr -d '\r')
echo ""
echo "${COLOR_BLUE}AWS EC2 인스턴스의 Public IP를 입력하세요.${COLOR_NC}"
read -p "VM-IP: " ec2_ip
ec2_ip=$(echo "$ec2_ip" | tr -d '\r')
echo ""

# ---------- default.conf 파일의 server_name 자동 수정 ----------
# ⚠️ Linux(GNU sed) 호환 포맷: sed -i
# 치환 전 백업 후 복사, 이후 원본 복원 (반복 실행 가능성 보장)
cp nginx/prod_http.conf nginx/prod_http.conf.bak
sed -i "s/chronicconditioncheck.duckdns.org/${domain}/g" nginx/prod_http.conf

# ---------- 수정된 prod_http.conf 파일을 AWS EC2 인스턴스 내로 복사 ----------
scp -i ~/.ssh/${ssh_key_file} nginx/prod_http.conf ubuntu@${ec2_ip}:~/project/nginx/default.conf

# ---------- 로컬 파일 복원 (기준 도메인 유지) ----------
mv nginx/prod_http.conf.bak nginx/prod_http.conf

# ---------- AWS EC2 접속 후 도메인 인증 및 SSL 발급 ----------
echo "${COLOR_BLUE}AWS EC2 인스턴스에 SSH 접속을 시도합니다.${COLOR_NC}"
chmod 400 ~/.ssh/${ssh_key_file}
# ⚠️ heredoc에 단일 따옴표 없이 EOF를 사용하여 변수 확장 허용
ssh -i ~/.ssh/${ssh_key_file} ubuntu@${ec2_ip} \
  "CERT_EMAIL=${email} \
   CERT_DOMAIN=${domain} \
   DUCKDNS_TOKEN=${DUCKDNS_TOKEN} \
   bash -s" << EOF
  set -e
  cd project

  # duckdns.ini 파일을 certbot-conf 볼륨 내에 안전하게 생성
  docker run --rm \
    -v certbot-conf:/etc/letsencrypt \
    alpine sh -c "printf 'dns_duckdns_token = %s\n' '${DUCKDNS_TOKEN}' > /etc/letsencrypt/duckdns.ini && chmod 600 /etc/letsencrypt/duckdns.ini"

  # certbot-dns-duckdns 플러그인 설치 후 인증서 발급 수행 (DNS-01 방식)
  docker run --rm \
    --name certbot \
    -v certbot-conf:/etc/letsencrypt \
    --entrypoint /bin/sh \
    certbot/certbot -c "pip install certbot-dns-duckdns && certbot certonly --authenticator dns-duckdns --dns-duckdns-credentials /etc/letsencrypt/duckdns.ini --dns-duckdns-propagation-seconds 60 -d ${CERT_DOMAIN} --agree-tos --email ${CERT_EMAIL} --non-interactive"
EOF
echo "${COLOR_GREEN} 도메인 인증서 발급 성공!${COLOR_NC}"
echo ""

# ---------- https 즉시 적용 여부 입력 Prompt ----------
read -p "${COLOR_BLUE} HTTPS를 즉시 서버에 적용하시겠습니까?(Y/N)${COLOR_BLUE}" apply_https
apply_https=$(echo "$apply_https" | tr '[:upper:]' '[:lower:]' | tr -d '\r')

if [[ "$apply_https" == "y" || "$apply_https" == "yes" ]]; then
  # ---------- prod_https.conf: 이미 도메인이 고정값이므로 별도 sed 불필요 ----------
  # 도메인이 다른 경우에만 치환 필요 (기본값: chronicconditioncheck.duckdns.org)
  if [[ "$domain" != "chronicconditioncheck.duckdns.org" ]]; then
    cp nginx/prod_https.conf nginx/prod_https.conf.bak
    sed -i "s/chronicconditioncheck.duckdns.org/${domain}/g" nginx/prod_https.conf
  fi

  # ---------- 수정된 prod_https.conf 파일을 EC2 인스턴스 내로 복사 ----------
  scp -i ~/.ssh/${ssh_key_file} nginx/prod_https.conf ubuntu@${ec2_ip}:~/project/nginx/default.conf

  # ---------- 로컬 파일 복원 (기준 도메인 유지) ----------
  if [[ -f nginx/prod_https.conf.bak ]]; then
    mv nginx/prod_https.conf.bak nginx/prod_https.conf
  fi

  # ---------- EC2 접속 후 SSL 인증서를 적용하여 Nginx를 실행 및 certbot 재발급 서비스 실행 ----------
  # ⚠️ heredoc에 단일 따옴표 없이 EOF를 사용하여 변수 확장 허용
  ssh -i ~/.ssh/${ssh_key_file} ubuntu@${ec2_ip} \
  "CERT_EMAIL=${email} CERT_DOMAIN=${domain} bash -s" << EOF
      set -e
      cd project

      # 호스트 경로 의존성을 배제하고 alpine 컨테이너를 사용하여 볼륨 내에 설정 파일 다운로드
      docker run --rm \
        -v certbot-conf:/etc/letsencrypt \
        alpine sh -c "apk add --no-cache wget && wget -O /etc/letsencrypt/options-ssl-nginx.conf https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf && wget -O /etc/letsencrypt/ssl-dhparams.pem https://raw.githubusercontent.com/certbot/certbot/master/certbot/certbot/ssl-dhparams.pem"

      docker restart nginx
      docker compose up -d certbot
EOF
  echo "${COLOR_GREEN} https를 적용한 서버 배포 완료!${COLOR_NC}"
  echo ""
else
  echo "${COLOR_BLUE} 스크립트를 종료합니다.${COLOR_NC}"
fi

