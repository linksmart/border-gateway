#!/bin/bash

# prerequisites:
# Docker
# all tests: ./build_and_run_tests.sh no_ssl nginx nginx_no_x_forward nginx_444 ei redis_1 redis_120

# workaround to have jq available in git bash for Windows
shopt -s expand_aliases
source ~/.bashrc

scriptDir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$scriptDir/.."

docker build -f Dockerfile-tester -t janniswarnat/tester:latest .

if [ "$?" -ne 0 ]; then
  notify "@jannis.warnat tester image could not be built"
  exit 1
fi

function notify
{
if [ "$POST_CHAT_MESSAGE" = true ] ; then
   cd "$scriptDir"
  ./postChatMessage.sh "$1"
fi
}

cd "$scriptDir/.."
docker build -f Dockerfile-npm -t linksmart/bgw:npm .

if [ "$?" -ne 0 ]; then
  notify "@jannis.warnat Intermediate image could not be built"
  exit 1
fi

docker build -f Dockerfile-test -t linksmart/bgw:snapshot .

if [ "$?" -ne 0 ]; then
  notify "@jannis.warnat Image could not be built"
  exit 1
fi

# Start openid (Keycloak)
cd "$scriptDir/openid"
docker volume create --name=pgdata
docker-compose up -d openid-ssl
sleep 40

# Start backend (Mosquitto, Service Catalog, Redis)
cd "$scriptDir/backend"
docker-compose up -d

CA=$1

for test in "$@"
do
    cd "$scriptDir/$test"
    docker-compose down
done

declare -A runtimes

for test in "$@"
do
    start=$(date +%s)

    cd "$scriptDir/$test"
    echo "current directory is $(pwd)"
    echo "Keycloak status:"
    docker logs openid_keycloak_1 2>&1 | grep started

    if [[ $test == *"nginx"* ]] || [[ $test == *"no_ssl"* ]]; then
      docker-compose up -d bgw
    fi

    if [[ $test != *"no_ssl"* ]]; then
      docker-compose up -d bgw-ssl
    fi

    docker-compose up --exit-code-from tester tester

    if [ "$?" -ne 0 ]; then

        notify "@jannis.warnat Tester failed for test $test"
        exit 1
    fi

    end=$(date +%s)

    if [[ $test == *"nginx"* ]] || [[ $test == *"no_ssl"* ]]; then
        docker-compose logs test_bgw_1 &> "./lastRun.log"
    else
        docker-compose logs test_bgw-ssl_1 &>> "./lastRun.log"
    fi

    docker-compose down

    runtimes[$test]=$((end-start))
done

for test in "$@"
do
    echo "Runtime for $test: ${runtimes[$test]}"
done

# Stop backend (Mosquitto, Service Catalog, Redis)
cd "$scriptDir/backend"
docker-compose down

# Stop openid (Keycloak)
cd "$scriptDir/openid"
docker-compose down
docker volume rm pgdata

printf "\n"
echo "All tests successful :-)!"
cd "$scriptDir"
notify "@jannis.warnat All tests successful!"
exit 0