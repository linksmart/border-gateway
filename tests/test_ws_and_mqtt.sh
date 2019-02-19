#!/bin/bash

# workaround to have jq available in Docker Toolbox for Windows
shopt -s expand_aliases
source ~/.bashrc

CA=$1

host=$2
if $3
then
  wsProtocol="wss"
  mqttSecureParams="--insecure --cafile $CA"
else
  wsProtocol="ws"
  mqttSecureParams="--insecure"
fi

mqttPort=$4
wsPort=$5
user=$6
pass=$7
tokenEndpoint=$8

scriptDir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd $scriptDir

testWebsockets=".\mqtt_over_websocket\index.js"
testWebsocketsGeneric=".\generic_websocket\index.js"

echo "generic websockets wrong token"
node "$testWebsocketsGeneric" "$wsProtocol://$host:$wsPort/" "123"

if [ $? -ne 1 ]; then
  echo "exit code = $?"
  exit 1
fi

accessToken=$(curl --silent -d "client_id=bgw_client" -d "username=$user" -d "password=$pass" -d "grant_type=password" -L "$tokenEndpoint" | jq -r ".access_token")
echo "accessToken: $accessToken"

echo "generic websockets"
node "$testWebsocketsGeneric" "$wsProtocol://$host:$wsPort/" "$accessToken"

if [ $? -ne 0 ]; then
  echo "exit code = $?"
  exit 1
fi

echo "websockets with user/pass qos 2"
node "$testWebsockets" "$wsProtocol"://"$host":$wsPort/ $user $pass 2

if [ $? -ne 0 ]; then
  echo "exit code = $?"
  exit 1
fi

echo "websockets with user/pass qos 0"
node "$testWebsockets" "$wsProtocol"://"$host":$wsPort/ $user $pass 0

if [ $? -ne 0 ]; then
  echo "exit code = $?"
  exit 1
fi

echo "websockets with user/pass qos 0 anonymous"
node "$testWebsockets" "$wsProtocol"://"$host":$wsPort/ anonymous anonymous 0

if [ $? -ne 1 ]; then
  echo "exit code = $?"
  exit 1
fi

accessToken=$(curl --silent -d "client_id=bgw_client" -d "username=$user" -d "password=$pass" -d "grant_type=password" -L "$tokenEndpoint" | jq -r ".access_token")
echo "accessToken: $accessToken"

echo "websockets with user/pass qos 2"
node "$testWebsockets" "$wsProtocol"://"$host":$wsPort/ $accessToken "" 2

if [ $? -ne 0 ]; then
  echo "exit code = $?"
  exit 1
fi

echo "websockets with user/pass qos 0"
node "$testWebsockets" "$wsProtocol"://"$host":$wsPort/ $accessToken "" 0

if [ $? -ne 0 ]; then
  echo "exit code = $?"
  exit 1
fi

echo "mosquitto_pub anonymous"
command="mosquitto_pub $mqttSecureParams -h $host -p $mqttPort -d -t LS/test -m \"hello there\" -q 0"
echo "$command"
eval "$command$"

if [ $? -ne 5 ]; then
  echo "exit code = $?"
  exit 1
fi

echo "mosquitto_pub user/pass qos 2"

command="mosquitto_pub $mqttSecureParams -h $host -p $mqttPort -d -t LS/test -m \"hello there\" -u $user -P $pass -q 2"
echo "$command"
eval "$command$"

if [ $? -ne 0 ]; then
  echo "exit code = $?"
  exit 1
fi

echo "mosquitto_pub user/pass qos 0"

for var in 1 2 3 4 5 6 7 8 9 10
do
  command="mosquitto_pub $mqttSecureParams -h $host -p $mqttPort -d -t LS/test -m \"hello there\" -u $user -P $pass -q 0"
  echo "$command"
  eval "$command$"
done

access_token=$(curl --silent -d "client_id=bgw_client" -d "username=$user" -d "password=$pass" -d "grant_type=password" -L "$tokenEndpoint" | jq -r ".access_token")
echo "access token: $access_token"

echo "mosquitto pub access token qos 2"
command="mosquitto_pub $mqttSecureParams -h $host -p $mqttPort -d -t LS/test -m \"hello there\" -u $access_token -q 2"
echo "$command"
eval "$command$"

if [ $? -ne 0 ]; then
  echo "exit code = $?"
  exit 1
fi

echo "mosquitto_pub access token qos 0"
for var in 1 2 3 4 5 6 7 8 9 10
do
  command="mosquitto_pub $mqttSecureParams -h $host -p $mqttPort -d -t LS/test -m \"hello there\" -u $access_token -q 0"
  echo "$command"
  eval "$command$"
done

printf "\n"
echo "Test run successful!"

