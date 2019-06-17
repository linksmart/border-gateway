#!/bin/bash

# prerequisites:
# Docker
# all tests: ./build_and_run_tests.sh no_ssl nginx nginx_no_x_forward nginx_444 ei redis_1 redis_120

# workaround to have jq available in git bash for Windows
shopt -s expand_aliases
source ~/.bashrc

scriptDir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$scriptDir/.."

docker build -f Dockerfile-tester -t tester:latest .

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

# Start backend (Mosquitto, Service Catalog, Redis)
cd "$scriptDir/backend"
docker volume create --name=pgdata
docker-compose up -d keycloak
sleep 30
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
    docker logs keycloak 2>&1 | grep started
    docker-compose up -d bgw.test.eu

    if [[ $test == *"nginx"* ]]; then
      docker-compose up -d nginx
    fi

    docker-compose up --exit-code-from tester tester
    #docker-compose up tester

    #workaround until Windows 10 and most current docker-compose is available (hopefully)
    #exitCode=$(docker inspect $(docker-compose ps -q tester) | jq '.[0].State.ExitCode')
    #if [ "$exitCode" -ne 0 ]; then

    if [ "$?" -ne 0 ]; then

        notify "@jannis.warnat Tester failed for test $test"
        exit 1
    fi

    end=$(date +%s)
    docker-compose logs bgw.test.eu &> "./lastRun.log"

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

printf "\n"
echo "All tests successful :-)!"
cd "$scriptDir"
notify "@jannis.warnat All tests successful!"
exit 0