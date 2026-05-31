#!/bin/bash
set -eo pipefail

COLOR_GREEN=$(tput setaf 2)
COLOR_BLUE=$(tput setaf 4)
COLOR_RED=$(tput setaf 1)
COLOR_NC=$(tput sgr0)

cd "$(dirname "$0")/.."
source ./envs/.prod.env

# ---------- 도커 이미지 빌드 및 푸시 함수 ----------
build_and_push () {
  local docker_user=$1
  local docker_repo=$2
  local name=$3
  local tag=$4
  local dockerfile=$5
  local context=$6
  local tag_base=""

  if [[ "$name" == "FastAPI" ]]; then
    tag_base="app"
  else
    tag_base="ai"
  fi
  echo "${COLOR_BLUE}${name} Docker Image Build & Push Start (x86_64).${COLOR_NC}"
  # 빌드 환경(Windows/Mac)과 배포 환경(AWS x86_64)이 다를 수 있으므로
  # Docker Buildx를 사용하여 linux/amd64 아키텍처로 빌드와 동시에 푸시합니다.
  docker buildx build --platform linux/amd64 -t ${docker_user}/${docker_repo}:${tag_base}-${tag} -f ${dockerfile} ${context} --push

  echo "${COLOR_GREEN}${name} Done.${COLOR_NC}"
  echo ""
}

# ---------- Docker login Prompt ----------
echo "${COLOR_BLUE}도커 유저네임과 비밀번호(PAT)을 입력해주세요.${COLOR_NC}"
read -p "username: " docker_user
read -p "password: " docker_pw
docker_user=$(echo "$docker_user" | tr -d '\r')
docker_pw=$(echo "$docker_pw" | tr -d '\r')
echo ""


# ---------- Docker Login ----------
echo "${COLOR_BLUE}Docker login${COLOR_NC}"
if ! docker login -u ${docker_user} -p ${docker_pw} ; then
  echo "${COLOR_RED}도커 로그인에 실패했습니다. 도커 유저네임과 비밀번호를 확인해주세요.${COLOR_NC}"
  exit 1
fi
echo "${COLOR_GREEN}도커 로그인 성공!${COLOR_NC}"
echo ""

# ---------- Docker Repository Input Prompt ----------
echo "${COLOR_BLUE}도커 이미지를 업로드할 레포지토리 이름을 입력해주세요.${COLOR_NC}"
read -p "Docker Repository Name: " docker_repo
docker_repo=$(echo "$docker_repo" | tr -d '\r')
echo ""

# ---------- Select Prompt ----------
echo "${COLOR_BLUE}배포 전 빌드 & 푸시할 서비스를 선택하세요.${COLOR_NC}"
echo "1) fastapi"
echo "2) ai_worker"
echo "3) 모두 배포 (fastapi 및 ai_worker)"
echo "4) 빌드 건너뛰고 설정 복사 및 원격 배포만 진행 (이미 도커 이미지가 빌드/푸시된 경우)"
read -p "선택 (1, 2, 3 또는 4): " selection
selection=$(echo "$selection" | tr -d '\r')
echo ""


# ---------- Docker Image Build & Push ----------
DEPLOY_SERVICES=()

case $selection in
  1)
    echo "${COLOR_BLUE}FastAPI 앱의 배포 버젼을 입력하세요(ex. v1.0.0)${COLOR_NC}"
    read -p "FastAPI 앱 버젼: " fastapi_version
    fastapi_version=$(echo "$fastapi_version" | tr -d '\r')
    build_and_push ${docker_user} ${docker_repo} "FastAPI" ${fastapi_version} "app/Dockerfile" "."
    DEPLOY_SERVICES+=("fastapi")
    ;;
  2)
    echo "${COLOR_BLUE}AI-worker 앱의 배포 버젼을 입력하세요(ex. v1.0.0)${COLOR_NC}"
    read -p "AI-worker 앱 버젼: " ai_version
    ai_version=$(echo "$ai_version" | tr -d '\r')
    build_and_push ${docker_user} ${docker_repo} "AI Worker" ${ai_version} "ai_worker/Dockerfile" "."
    DEPLOY_SERVICES+=("ai-worker")
    ;;
  3)
    echo "${COLOR_BLUE}FastAPI 앱의 배포 버젼을 입력하세요(ex. v1.0.0)${COLOR_NC}"
    read -p "FastAPI 앱 버젼: " fastapi_version
    fastapi_version=$(echo "$fastapi_version" | tr -d '\r')
    build_and_push ${docker_user} ${docker_repo} "FastAPI" ${fastapi_version} "app/Dockerfile" "."
    DEPLOY_SERVICES+=("fastapi")

    echo "${COLOR_BLUE}AI-worker 앱의 배포 버젼을 입력하세요(ex. v1.0.0)${COLOR_NC}"
    read -p "AI-worker 앱 버젼: " ai_version
    ai_version=$(echo "$ai_version" | tr -d '\r')
    build_and_push ${docker_user} ${docker_repo} "AI Worker" ${ai_version} "ai_worker/Dockerfile" "."
    DEPLOY_SERVICES+=("ai-worker")
    ;;
  4)
    echo "${COLOR_BLUE}로컬 빌드를 건너뛰고 설정 복사 및 원격 배포만 진행합니다.${COLOR_NC}"
    DEPLOY_SERVICES=("fastapi" "ai-worker" "nginx")
    ;;
  *)
    echo "${COLOR_RED}잘못된 선택입니다: $selection${COLOR_NC}"
    exit 1
    ;;
esac

if [[ "$selection" != "4" ]]; then
  echo "${COLOR_GREEN}모든 선택된 이미지 빌드 & 푸시 완료! 🎉${COLOR_NC}"
fi
echo "${COLOR_BLUE}배포 대상 서비스: ${DEPLOY_SERVICES[*]}${COLOR_NC}"
echo ""

# ---------- SSH 접속 정보 입력 prompt ----------
echo "${COLOR_BLUE}AWS EC2 인스턴스 생성시 발급받은 ssh key 파일의 파일명을 입력하세요.(ex. ai_health_key.pem)${COLOR_NC}"
read -p "SSH 키 파일명: " ssh_key_file
ssh_key_file=$(echo "$ssh_key_file" | tr -d '\r')
echo ""

echo "${COLOR_BLUE}AWS EC2 인스턴스의 Public IP를 입력하세요.${COLOR_NC}"
read -p "VM-IP: " ec2_ip
ec2_ip=$(echo "$ec2_ip" | tr -d '\r')
echo ""

echo "${COLOR_BLUE}배포중인 서버의 https 여부를 선택하세요.${COLOR_NC}"
echo "1) http 사용중"
echo "2) https 사용중"
read -p "선택(ex. 1): " is_https
is_https=$(echo "$is_https" | tr -d '\r')
echo ""

# ---------- AWS EC2 인스턴스 내에 배포 준비 파일 복사 ----------
scp -i ~/.ssh/${ssh_key_file} envs/.prod.env ubuntu@${ec2_ip}:~/project/.env
scp -i ~/.ssh/${ssh_key_file} docker-compose.prod.yml ubuntu@${ec2_ip}:~/project/docker-compose.yml
if [[ "$is_https" == "1" ]]; then
  # ---------- prod_http.conf: IP를 도메인 자리에 임시 삽입 후 SCP, 이후 복원 ----------
  # ⚠️ Linux(GNU sed) 호환 포맷: sed -i
  cp nginx/prod_http.conf nginx/prod_http.conf.bak
  sed -i "s/chronicconditioncheck.duckdns.org/${ec2_ip}/g" nginx/prod_http.conf
  scp -i ~/.ssh/${ssh_key_file} nginx/prod_http.conf ubuntu@${ec2_ip}:~/project/nginx/default.conf
  mv nginx/prod_http.conf.bak nginx/prod_http.conf
else
  echo "${COLOR_BLUE} 사용중인 Duck DNS 도메인을 입력하세요. (ex. your-name.duckdns.org)${COLOR_NC}"
  read -p "Domain: " domain
  domain=$(echo "$domain" | tr -d '\r')
  # ---------- prod_https.conf: 도메인 전역 자동 수정 후 SCP, 이후 복원 ----------
  if [[ "$domain" != "chronicconditioncheck.duckdns.org" ]]; then
    cp nginx/prod_https.conf nginx/prod_https.conf.bak
    sed -i "s/chronicconditioncheck.duckdns.org/${domain}/g" nginx/prod_https.conf
    scp -i ~/.ssh/${ssh_key_file} nginx/prod_https.conf ubuntu@${ec2_ip}:~/project/nginx/default.conf
    mv nginx/prod_https.conf.bak nginx/prod_https.conf
  else
    scp -i ~/.ssh/${ssh_key_file} nginx/prod_https.conf ubuntu@${ec2_ip}:~/project/nginx/default.conf
  fi
fi

# ---------- AWS EC2 인스턴스 배포 자동화 ----------
echo "${COLOR_BLUE}AWS EC2 인스턴스에 SSH 접속을 시도합니다.${COLOR_NC}"
chmod 400 ~/.ssh/${ssh_key_file}
ssh -i ~/.ssh/${ssh_key_file} ubuntu@${ec2_ip} \
  "DOCKER_USERNAME=${docker_user} \
   DOCKER_PAT=${docker_pw} \
   DEPLOY_SERVICES='${DEPLOY_SERVICES[*]}' \
   bash -s" << 'EOF'
  set -e
  cd project

  echo "Docker login"
  docker login -u "$DOCKER_USERNAME" -p "$DOCKER_PAT"

  echo "Deploying services: $DEPLOY_SERVICES"
  docker compose up -d --pull always --no-deps $DEPLOY_SERVICES

  docker image prune -af
EOF

echo "✅ Deployment finished."
