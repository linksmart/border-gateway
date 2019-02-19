#!/bin/bash

# prerequisites:
# CA pem file
# jq
# node: depcheck, newman
# env variables for node (NODE_PATH, PATH): https://stackoverflow.com/questions/9587665/nodejs-cannot-find-installed-module-on-windows
# mosquitto at <domain>:1883
# service catalog at <domain>:8082
# redis at <domain>:6379
# all tests: ./test_all.sh <path_to_CA_file.pem> no_ssl nginx nginx_no_x_forward nginx_444 ei redis_1 redis_120

# workaround to have jq available in Docker Toolbox for Windows
shopt -s expand_aliases
source ~/.bashrc

scriptDir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd $scriptDir
# echo "scriptDir = $scriptDir"

function notify
{
if [ "$POST_CHAT_MESSAGE" = true ] ; then
   cd "$scriptDir"
  ./postChatMessage.sh "$1"
fi
}

depcheck "$scriptDir/../bgw-aaa-client/"
depcheck "$scriptDir/../bgw-auth-service/"
depcheck "$scriptDir/../bgw-configuration-service/"
depcheck "$scriptDir/../bgw-external-interface/"
depcheck "$scriptDir/../bgw-http-proxy/"
depcheck "$scriptDir/../bgw-mqtt-proxy/"
depcheck "$scriptDir/../bgw-websocket-proxy/"

cd "$scriptDir/.."
docker build -f Dockerfile-npm -t docker.linksmart.eu/bgw:npm .

if [ "$?" -ne 0 ]; then
  notify "@jannis.warnat Intermediate image could not be built"
  exit 1
fi

docker build -f Dockerfile-test -t docker.linksmart.eu/bgw:snapshot .
# docker build -t docker.linksmart.eu/bgw:snapshot . # Dockerfile for Bamboo

if [ "$?" -ne 0 ]; then
  notify "@jannis.warnat Snapshot image could not be built"
  exit 1
fi

CA=$1

for test in "${@:2}"
do
    cd "$scriptDir/$test"
    docker-compose down
done

declare -A runtimes

for test in "${@:2}"
do
    cd "$scriptDir/$test"
    docker-compose up -d

    if [ "$?" -ne 0 ]; then
        notify "@jannis.warnat Containers did not start for test $test"
        exit 1
    fi

    start=$(date +%s)
    newman run -k --bail -e "postman_environment.json" -d "data.json" ../test_border_gateway.postman_collection.json

    if [ "$?" -ne 0 ]; then
        notify "@jannis.warnat Newman tests failed for test $test"
        exit 1
    fi

    domain=$(jq -r '.[0].domain' "data.json")
    wsPort=$(jq '.[0].ws_port' "data.json")
    mqttPort=$(jq '.[0].mqtt_port' "data.json")
    secure=$(jq '.[0].secure' "data.json")
    tokenEndpoint=$(jq -r '.[0].tokenEndpoint' "data.json")
    username=$(jq -r '.[0].username' "data.json")
    password=$(jq -r '.[0].password' "data.json")

    echo "domain = $domain"
    echo "wsPort = $wsPort"
    echo "mqttPort = $mqttPort"
    echo "secure = $secure"
    echo "tokenEndpoint = $tokenEndpoint"
    echo "username = $username"
    echo "password = $password"

    ../test_ws_and_mqtt.sh $CA "$domain" $secure "$mqttPort" "$wsPort" $username $password $tokenEndpoint

    if [ "$?" -ne 0 ]; then
         notify "@jannis.warnat Mqtt and WebSocket tests failed for test $test"
        exit 1
    fi

    end=$(date +%s)
    docker-compose logs bgw &> "./lastRun.log"
    docker-compose down
    runtimes[$test]=$((end-start))
done

for test in "${@:2}"
do
    echo "Runtime for $test: ${runtimes[$test]}"
done

printf "\n"
echo "All tests successful :-)!"
cd "$scriptDir"
notify "@jannis.warnat All tests successful!"
exit 0