#!/bin/bash

# prerequisites:
# Docker
# all tests: ./build_and_run_tests.sh no_ssl nginx nginx_no_x_forward nginx_444 ei redis_1 redis_120

scriptDir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$scriptDir/registry"
docker-compose up -d

cd "$scriptDir/.."
docker build -f Dockerfile-tester -t localhost:5000/janniswarnat/tester:latest .
docker push localhost:5000/janniswarnat/tester:latest

if [ "$?" -ne 0 ]; then
  exit 1
fi

cd "$scriptDir/.."
docker build -t localhost:5000/linksmart/bgw:test .
docker push localhost:5000/linksmart/bgw:test

if [ "$?" -ne 0 ]; then
  exit 1
fi

docker swarm init

# Start openid (Keycloak)
cd "$scriptDir/openid"
docker volume create --name=pgdata
docker stack deploy --compose-file ./docker-compose.yml openid

# Start backend (Mosquitto, Service Catalog, Redis)
cd "$scriptDir/backend"
docker stack deploy --compose-file ./docker-compose.yml backend

cd "$scriptDir/tester"
docker-compose down

docker stack rm test
until [ -z "$(docker network ls --filter name=test_public -q)" ] && [ -z "$(docker network ls --filter name=test_bgw -q)" ]; do
    echo "Waiting for network test_public and test_bgw to be removed"
    sleep 3;
done

declare -A runtimes

until [ -n "$(docker service logs openid_keycloak 2>&1 | grep 'Admin console listening')" ]; do
  echo "Waiting for Keycloak to be ready"
  sleep 3;
done

echo "Keycloak status ok:"
docker service logs openid_keycloak 2>&1 | grep 'Admin console listening'

for test in "$@"
do
    start=$(date +%s)

    cd "$scriptDir/$test"
    echo "current directory is $(pwd)"

    docker stack deploy --compose-file ./docker-compose.yml test

    URL=$(jq -r '.[0].url' "data.json")
    echo "URL = $URL"

    until [ $(docker run --network=test_public --rm byrnedo/alpine-curl --insecure -s -o /dev/null -w "%{http_code}" "$URL"/status) == "200" ]; do
        echo "Waiting for $URL/status to be ready"
        sleep 3;
    done

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

cd "$scriptDir/registry"
docker-compose down

# Stop backend (Mosquitto, Service Catalog, Redis)
cd "$scriptDir/backend"
docker stack rm backend

# Stop openid (Keycloak)
cd "$scriptDir/openid"
docker stack rm openid

until [ -z "$(docker network ls --filter name=backend_services -q)" ]; do
    echo "waiting for network backend_services to be removed"
    sleep 3;
done

until [ -z "$(docker network ls --filter name=openid_web -q)" ] && [ -z "$(docker network ls --filter name=openid_backend -q)" ]; do
    echo "Waiting for networks openid_web and openid_backend to be removed"
    sleep 3;
done

docker volume rm pgdata

printf "\n"
echo "All tests successful :-)!"
cd "$scriptDir"
exit 0