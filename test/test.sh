#!/bin/bash

CA=$1
test=$2

# workaround to have jq available in Docker Toolbox for Windows
shopt -s expand_aliases
source ~/.bashrc

scriptDir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd $scriptDir

function notify
{
if [ "$POST_CHAT_MESSAGE" = true ] ; then
   cd "$scriptDir"
  ./postChatMessage.sh "$1"
fi
}

declare -A runtimes

cd "$scriptDir/$test"
echo "current directory is $(pwd)"
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
audience=$(jq -r '.[0].audience' "data.json")
client_id=$(jq -r '.[0].client_id' "data.json")
client_secret=$(jq -r '.[0].client_secret' "data.json")

echo "domain = $domain"
echo "wsPort = $wsPort"
echo "mqttPort = $mqttPort"
echo "secure = $secure"
echo "tokenEndpoint = $tokenEndpoint"
echo "username = $username"
echo "password = $password"
echo "audience = $audience"
echo "client_id = $client_id"
echo "client_secret = $client_secret"


../test_ws_and_mqtt.sh "$CA" "$domain" $secure "$mqttPort" "$wsPort" "$username" "$password" "$tokenEndpoint" "$audience" "$client_id" "$client_secret"

if [ "$?" -ne 0 ]; then
  notify "@jannis.warnat Mqtt and WebSocket tests failed for test $test"
  exit 1
fi

printf "\n"
echo "Test $test finished successfully :-)!"
notify "@jannis.warnat All tests successful!"
exit 0