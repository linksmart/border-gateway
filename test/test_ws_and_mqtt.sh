#!/bin/bash

CA=$1

host=$2
if $3
then
  wsProtocol="wss"
  mqttSecureParams="--debug --cafile $CA"
else
  wsProtocol="ws"
  mqttSecureParams="--debug"
fi

echo "cat $CA"
cat "$CA"

mqttPort=$4
wsPort=$5
user=$6
pass=$7
tokenEndpoint=$8
audience=$9
client_id="${10}"
client_secret="${11}"

scriptDir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
echo "scriptDir = $scriptDir"
cd $scriptDir

testWebsockets="./mqtt_over_websocket/index.js"
testWebsocketsGeneric="./generic_websocket/index.js"

echo "generic websockets no token"
node "$testWebsocketsGeneric" "$CA" "$wsProtocol://$host:$wsPort/"

if [ $? -ne 1 ]; then
  echo "exit code = $?"
  exit 1
fi

echo "generic websockets wrong token"
node "$testWebsocketsGeneric" "$CA" "$wsProtocol://$host:$wsPort/?access_token=123"

if [ $? -ne 1 ]; then
  echo "exit code = $?"
  exit 1
fi

echo "generic websockets wrong password"
node "$testWebsocketsGeneric" "$CA" "$wsProtocol://$host:$wsPort/?basic_auth=123"

if [ $? -ne 1 ]; then
  echo "exit code = $?"
  exit 1
fi

echo "generic websockets correct password"
basedPassword=$(echo -n "$user:$pass" | base64)
node "$testWebsocketsGeneric" "$CA" "$wsProtocol://$host:$wsPort/?basic_auth=$basedPassword"

if [ $? -ne 0 ]; then
  echo "exit code = $?"
  exit 1
fi

access_token=$(curl --cacert $CA --silent -d "client_id=$client_id" -d "client_secret=$client_secret" -d "username=$user" -d "password=$pass" -d "grant_type=password" -d "audience=$audience" -L "$tokenEndpoint" | jq -r ".access_token")
echo "access_token: $access_token"

echo "generic websockets correct token"
node "$testWebsocketsGeneric" "$CA" "$wsProtocol://$host:$wsPort/?access_token=$access_token"

if [ $? -ne 0 ]; then
  echo "exit code = $?"
  exit 1
fi

echo "websockets with user/pass qos 2"
node "$testWebsockets" "$CA" "$wsProtocol"://"$host:$wsPort/?access_token=$access_token" $user $pass 2

if [ $? -ne 0 ]; then
  echo "exit code = $?"
  exit 1
fi

echo "websockets with user/pass qos 0"
node "$testWebsockets" "$CA" "$wsProtocol"://"$host:$wsPort/?access_token=$access_token" $user $pass 0

if [ $? -ne 0 ]; then
  echo "exit code = $?"
  exit 1
fi

echo "websockets with user/pass qos 0 anonymous"
node "$testWebsockets" "$CA" "$wsProtocol"://"$host:$wsPort/?access_token=$access_token" anonymous anonymous 0

if [ $? -ne 1 ]; then
  echo "exit code = $?"
  exit 1
fi

access_token=$(curl --cacert $CA --silent -d "client_id=$client_id" -d "client_secret=$client_secret" -d "username=$user" -d "password=$pass" -d "grant_type=password" -d "audience=$audience" -L "$tokenEndpoint" | jq -r ".access_token")
echo "access_token: $access_token"

echo "websockets with user/pass qos 2"
node "$testWebsockets" "$CA" "$wsProtocol"://"$host:$wsPort/?access_token=$access_token" $access_token "" 2

if [ $? -ne 0 ]; then
  echo "exit code = $?"
  exit 1
fi

echo "websockets with user/pass qos 0"
node "$testWebsockets" "$CA" "$wsProtocol"://"$host:$wsPort/?access_token=$access_token" $access_token "" 0

if [ $? -ne 0 ]; then
  echo "exit code = $?"
  exit 1
fi

echo "mosquitto_pub anonymous"
command="mosquitto_pub $mqttSecureParams -h $host -p $mqttPort -d -t LS/test -m \"hello there\" -q 0"
echo "$command"
eval "$command$"
exitCode=$?

# formerly exit code 5 was returned!
if [ "$exitCode" -ne 5 ] && [ "$exitCode" -ne 0 ]; then
  echo "exit code = $exitCode"
  exit 1
fi

echo "mosquitto_pub user/pass qos 2"

command="mosquitto_pub $mqttSecureParams -h $host -p $mqttPort -d -t LS/test -m \"hello there\" -u \"$user\" -P \"$pass\" -q 2"
echo "$command"
eval "$command$"

if [ $? -ne 0 ]; then
  echo "exit code = $?"
  exit 1
fi

echo "mosquitto_pub user/pass qos 0"

for var in 1 2 3 4 5 6 7 8 9 10
do
  command="mosquitto_pub $mqttSecureParams -h $host -p $mqttPort -d -t LS/test -m \"hello there\" -u \"$user\" -P \"$pass\" -q 0"
  echo "$command"
  eval "$command$"
done

access_token=$(curl --cacert $CA --silent -d "client_id=$client_id" -d "client_secret=$client_secret" -d "username=$user" -d "password=$pass" -d "grant_type=password" -d "audience=$audience" -L "$tokenEndpoint" | jq -r ".access_token")
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

