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
  exit 1
fi

cd "$scriptDir/.."
docker build -t linksmart/bgw:snapshot .

if [ "$?" -ne 0 ]; then
  exit 1
fi

docker swarm init

# Start openid (Keycloak)
cd "$scriptDir/openid"
docker volume create --name=pgdata
docker stack deploy --compose-file ./docker-compose.yml openid

until [ -n "$(docker service logs openid_keycloak 2>&1 | grep 'Admin console listening')" ]; do
  echo "Waiting for Keycloak to be ready"
  sleep 3;
done

  echo "Keycloak status ok:"
  docker service logs openid_keycloak 2>&1 | grep 'Admin console listening'

# Start backend (Mosquitto, Service Catalog, Redis)
cd "$scriptDir/backend"
docker stack deploy --compose-file ./docker-compose.yml backend

CA=$1

cd "$scriptDir/tester"
docker-compose down

for test in "$@"
do
    cd "$scriptDir/$test"
    docker stack rm test
    until [ -z "$(docker network ls --filter name=test_public -q)" ] && [ -z "$(docker network ls --filter name=test_bgw -q)" ]; do
        echo "Waiting for network test_public and test_bgw to be removed"
        sleep 3;
    done
done

declare -A runtimes

for test in "$@"
do
    start=$(date +%s)

    cd "$scriptDir/$test"
    echo "current directory is $(pwd)"

    docker stack deploy --compose-file ./docker-compose.yml test

    if [[ $test != *"no_ssl"* ]]; then
        until [ -n "$(docker ps | grep bgw-ssl)" ]; do
            echo "Waiting for bgw-ssl to be ready"
            sleep 3;
        done
    else
        until [ -n "$(docker ps | grep bgw)" ]; do
            echo "Waiting for bgw-ssl to be ready"
            sleep 3;
        done
    fi

    cd "$scriptDir/tester"
    export TESTDIR="$test"
    docker-compose up --exit-code-from tester tester

    if [ "$?" -ne 0 ]; then

        exit 1
    fi

    end=$(date +%s)

    cd "$scriptDir/tester"
    docker-compose down

    cd "$scriptDir/$test"
    docker stack rm test

    until [ -z "$(docker network ls --filter name=test_public -q)" ] && [ -z "$(docker network ls --filter name=test_bgw -q)" ]; do
      echo "Waiting for network test_public and test_bgw to be removed"
      sleep 3;
    done

    runtimes[$test]=$((end-start))
done

for test in "$@"
do
    echo "Runtime for $test: ${runtimes[$test]}"
done

# Stop backend (Mosquitto, Service Catalog, Redis)
cd "$scriptDir/backend"
docker stack rm backend
until [ -z "$(docker network ls --filter name=backend_services -q)" ]; do
    echo "waiting for network backend_services to be removed"
    sleep 3;
done

# Stop openid (Keycloak)
cd "$scriptDir/openid"
docker stack rm openid

until [ -z "$(docker network ls --filter name=openid_web -q)" ] && [ -z "$(docker network ls --filter name=openid_backend -q)" ]; do
    echo "Waiting for networks openid_web and openid_backend to be removed"
    sleep 3;
done

docker volume rm pgdata

printf "\n"
echo "All tests successful :-)!"
cd "$scriptDir"
exit 0