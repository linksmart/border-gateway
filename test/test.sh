#!/bin/bash

CA=$1/CA.pem

scriptDir="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
cd $scriptDir

echo "current directory is $(pwd)"
echo "Test is $TESTDIR"
newman run -k --bail --ssl-client-cert $1/client.pem --ssl-client-key $1/client.key -d "data.json" test_border_gateway.postman_collection.json

if [ "$?" -ne 0 ]; then
  exit 1
fi

domain=$(jq -r '.[0].domain' "data.json")
wsPort=$(jq '.[0].ws_port' "data.json")
mqttPort=$(jq '.[0].mqtt_port' "data.json")
mqttVersion=(jq '.[0].mqtt_version' "data.json")
secure=$(jq '.[0].secure' "data.json")
tokenEndpoint=$(jq -r '.[0].tokenEndpoint' "data.json")
username=$(jq -r '.[0].username' "data.json")
password=$(jq -r '.[0].password' "data.json")
audience=$(jq -r '.[0].audience' "data.json")
client_id=$(jq -r '.[0].client_id' "data.json")
realm1_client_secret=$(jq -r '.[0].realm1_client_secret' "data.json")

echo "domain = $domain"
echo "wsPort = $wsPort"
echo "mqttPort = $mqttPort"
echo "mqttVersion = $mqttVersion"
echo "secure = $secure"
echo "tokenEndpoint = $tokenEndpoint"
echo "username = $username"
echo "password = $password"
echo "audience = $audience"
echo "client_id = $client_id"
echo "realm1_client_secret = $realm1_client_secret"

./test_ws_and_mqtt.sh "$1" "$domain" $secure "$mqttPort" "$mqttVersion" "$wsPort" "$username" "$password" "$tokenEndpoint" "$audience" "$client_id" "$realm1_client_secret"

if [ "$?" -ne 0 ]; then
  exit 1
fi

printf "\n"
echo "Test $TESTDIR finished successfully :-)!"
exit 0
