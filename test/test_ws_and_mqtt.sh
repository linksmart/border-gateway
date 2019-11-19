#!/bin/bash

function killSub() {
  subPids=$(ps -ef | grep mosquitto_sub | grep -v grep | awk '{print $2}')

  if [ -z "$subPids" ]; then
    echo "No mosquitto_sub processes to kill"
  else
    echo "killing processes" $subPids
    kill $subPids
    for pid in $subPids; do
      echo "waiting for process $pid"
      wait $pid 2>/dev/null
    done
  fi
}

function checkLog() {

  for var in 1 2 3; do
    logOccurence=$(cat ./mosquitto_sub.log | grep "$1" | wc -l)

    if [ "$logOccurence" -lt 1 ]; then
      echo "logOccurence is wrong: number of occurences of $1 in log is less than 1"
      echo "cat mosquitto_sub.log:"
      cat ./mosquitto_sub.log
      sleep $var
    else
      echo "logOccurence is correct: number of occurences of $1 in log is bigger than 1"
      echo "cat mosquitto_sub.log:"
      cat ./mosquitto_sub.log
      break
    fi
  done

  if [ "$logOccurence" -lt 1 ]; then
    echo "logOccurence is wrong: number of occurences of $1 in log is less than 1"
    echo "cat mosquitto_sub.log:"
    cat ./mosquitto_sub.log
    killSub
    exit 1
  fi
}

function checkSubCount() {

  for var in 1 2 3 4 5; do
    subCount=$(cat ./mosquitto_sub.log | wc -l)

    if [ "$subCount" -ne "$1" ]; then
      echo "subCount is wrong: $subCount instead of $1... waiting $var seconds"
      echo "cat mosquitto_sub.log:"
      cat ./mosquitto_sub.log
      sleep $var
    else
      echo "subCount is correct: $subCount... breaking"
      echo "cat mosquitto_sub.log:"
      cat ./mosquitto_sub.log
      break
    fi
  done

  if [ "$subCount" -ne "$1" ]; then
    echo "subCount is wrong: $subCount instead of $1... exiting"
    echo "cat mosquitto_sub.log:"
    cat ./mosquitto_sub.log
    killSub
    exit 1
  fi
}

CA=$1/CA.pem
clientCert=$1/client.pem
clientKey=$1/client.key

host=$2
if $3; then
  wsProtocol="wss"
  mqttSecureParams="--cafile $CA --cert $clientCert --key $clientKey"
else
  wsProtocol="ws"
  mqttSecureParams=""
fi

#echo "cat $CA"
#cat "$CA"

mqttPort=$4
mqttVersion=$5
wsPort=$6
user=$7
pass=$8
tokenEndpoint=$9
audience="${10}"
client_id="${11}"
client_secret="${12}"

scriptDir="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
echo "scriptDir = $scriptDir"
cd $scriptDir

message="mosquitto_sub anonymous qos 0 in background"
echo "$message"
command="unbuffer mosquitto_sub --debug --keepalive 3600 $mqttSecureParams -h $host -p $mqttPort -V $mqttVersion -t tutorial &>./mosquitto_sub.log &"
echo "$command"
>./mosquitto_sub.log
unbuffer mosquitto_sub --debug --keepalive 3600 $mqttSecureParams -h $host -p $mqttPort -V $mqttVersion -t tutorial &>./mosquitto_sub.log &

checkLog "ot authori"
killSub

echo "mosquitto_sub user/pass ($user/$pass) qos 2 in background, other topic"
command="unbuffer mosquitto_sub --debug --keepalive 3600 $mqttSecureParams -h $host -p $mqttPort -V $mqttVersion -t other -u $user -P $pass -q 2 &>./mosquitto_sub.log &"
echo "$command"
>./mosquitto_sub.log
unbuffer mosquitto_sub --debug --keepalive 3600 $mqttSecureParams -h $host -p $mqttPort -V $mqttVersion -t other -u "$user" -P "$pass" -q 2 &>./mosquitto_sub.log &

if [ $mqttVersion -eq 5 ]; then
  checkLog "Subscribed (mid: 1): 135"
else
  checkLog "Subscribed (mid: 1): 128"
fi
killSub

echo "mosquitto_sub user/pass ($user/$pass) qos 2 in background, subonly topic"
command="unbuffer mosquitto_sub --debug --keepalive 3600 $mqttSecureParams -h $host -p $mqttPort -V $mqttVersion -t subonly -u $user -P $pass -q 2 &>./mosquitto_sub.log &"
echo "$command"
>./mosquitto_sub.log
unbuffer mosquitto_sub --debug --keepalive 3600 $mqttSecureParams -h $host -p $mqttPort -V $mqttVersion -t subonly -u "$user" -P "$pass" -q 2 &>./mosquitto_sub.log &

checkLog "Subscribed (mid: 1): 2"
checkSubCount 5

message="mosquitto_pub user/pass ($user/$pass) qos 2, subonly topic, expected exit code: 0"
echo "$message"
command="mosquitto_pub $mqttSecureParams --debug -h $host -p $mqttPort -V $mqttVersion -t subonly -m \"$message\" -u \"$user\" -P \"$pass\" -q 2"
echo "$command"
eval "$command$"

if [ $? -ne 0 ]; then
  echo "exit code = $?"
  killSub
  exit 1
fi

checkSubCount 5
killSub

echo "mosquitto_sub user/pass ($user/$pass) qos 2 in background"
command="unbuffer mosquitto_sub --debug --keepalive 3600 $mqttSecureParams -h $host -p $mqttPort -V $mqttVersion -t tutorial -u $user -P $pass -q 2 &>./mosquitto_sub.log &"
echo "$command"
>./mosquitto_sub.log
unbuffer mosquitto_sub --debug --keepalive 3600 $mqttSecureParams -h $host -p $mqttPort -V $mqttVersion -t tutorial -u "$user" -P "$pass" -q 2 &>./mosquitto_sub.log &

checkSubCount 5

message="mosquitto_pub anonymous qos 0, expected exit code: 5"
echo "$message"
command="mosquitto_pub $mqttSecureParams --debug -h $host -p $mqttPort -V $mqttVersion -t tutorial -m \"$message\" -q 0"
echo "$command"
eval "$command$"
exitCode=$?

# formerly exit code 5 was returned! (see https://github.com/eclipse/mosquitto/issues/1285)
if [ "$exitCode" -ne 5 ] && [ "$exitCode" -ne 0 ]; then
  echo "exit code = $exitCode"
  killSub
  exit 1
fi

checkSubCount 5

message="mosquitto_pub user/pass ($user/$pass) qos 2, other topic, expected exit code: 0"
echo "$message"
command="mosquitto_pub $mqttSecureParams --debug -h $host -p $mqttPort -V $mqttVersion -t other -m \"$message\" -u \"$user\" -P \"$pass\" -q 2"
echo "$command"
eval "$command$"

if [ $? -ne 0 ]; then
  echo "exit code = $?"
  killSub
  exit 1
fi

checkSubCount 5

message="mosquitto_pub user/pass ($user/$pass) qos 2, expected exit code: 0"
echo "$message"
command="mosquitto_pub $mqttSecureParams --debug -h $host -p $mqttPort -V $mqttVersion -t tutorial -m \"$message\" -u \"$user\" -P \"$pass\" -q 2"
echo "$command"
eval "$command$"

if [ $? -ne 0 ]; then
  echo "exit code = $?"
  killSub
  exit 1
fi

checkSubCount 10

message="mosquitto_pub user/pass ($user/$pass) qos 0 many times"
echo "$message"

for var in 1 2 3 4 5 6 7 8 9 10; do
  command="mosquitto_pub $mqttSecureParams --debug -h $host -p $mqttPort -V $mqttVersion -d -t tutorial -m \"$message $var\" -u \"$user\" -P \"$pass\" -q 0"
  echo "$command"
  eval "$command$"
done

checkSubCount 30

access_token=$(curl --cacert $CA --silent -d "client_id=$client_id" -d "client_secret=$client_secret" -d "username=$user" -d "password=$pass" -d "grant_type=password" -d "audience=$audience" -L "$tokenEndpoint" | jq -r ".access_token")
echo "access token: $access_token"

message="mosquitto pub access token (for $user/$pass) qos 2, expected exit code: 0"
echo "$message"
command="mosquitto_pub $mqttSecureParams --debug -h $host -p $mqttPort -V $mqttVersion -t tutorial -m \"$message\" -u $access_token -q 2"
echo "$command"
eval "$command$"

if [ $? -ne 0 ]; then
  echo "exit code = $?"
  killSub
  exit 1
fi

checkSubCount 35

message="mosquitto_pub access token (for $user/$pass) qos 0 many times"
echo "$message"

for var in 1 2 3 4 5 6 7 8 9 10; do
  command="mosquitto_pub $mqttSecureParams --debug -h $host -p $mqttPort -V $mqttVersion -t tutorial -m \"$message $var\" -u $access_token -q 0"
  echo "$command"
  eval "$command$"
done

checkSubCount 55

killSub

echo "mosquitto_sub access token (for $user/$pass) qos 2 in background"
command="unbuffer mosquitto_sub --debug --keepalive 3600 $mqttSecureParams -h $host -p $mqttPort -V $mqttVersion -t tutorial -u $access_token -q 2 &>./mosquitto_sub.log &"
echo "$command"
>./mosquitto_sub.log
unbuffer mosquitto_sub --debug --keepalive 3600 $mqttSecureParams -h $host -p $mqttPort -V $mqttVersion -t tutorial -u $access_token -q 2 &>./mosquitto_sub.log &

checkSubCount 5

killSub

testWebsockets="./mqtt_over_websocket/index.js"
testWebsocketsGeneric="./generic_websocket/index.js"

echo "generic websockets anonymous"
node "$testWebsocketsGeneric" "$CA" "$clientCert" "$clientKey" "$wsProtocol://$host:$wsPort/"

if [ $? -ne 1 ]; then
  echo "exit code = $?"
  exit 1
fi

echo "generic websockets wrong token"
node "$testWebsocketsGeneric" "$CA" "$clientCert" "$clientKey" "$wsProtocol://$host:$wsPort/?access_token=123"

if [ $? -ne 1 ]; then
  echo "exit code = $?"
  exit 1
fi

echo "generic websockets wrong password"
node "$testWebsocketsGeneric" "$CA" "$clientCert" "$clientKey" "$wsProtocol://$host:$wsPort/?basic_auth=123"

if [ $? -ne 1 ]; then
  echo "exit code = $?"
  exit 1
fi

echo "generic websockets correct password"
basedPassword=$(echo -n "$user:$pass" | base64)
node "$testWebsocketsGeneric" "$CA" "$clientCert" "$clientKey" "$wsProtocol://$host:$wsPort/?basic_auth=$basedPassword"

if [ $? -ne 0 ]; then
  echo "exit code = $?"
  exit 1
fi

access_token=$(curl --cacert $CA --silent -d "client_id=$client_id" -d "client_secret=$client_secret" -d "username=$user" -d "password=$pass" -d "grant_type=password" -d "audience=$audience" -L "$tokenEndpoint" | jq -r ".access_token")
echo "access_token: $access_token"

echo "generic websockets correct token"
node "$testWebsocketsGeneric" "$CA" "$clientCert" "$clientKey" "$wsProtocol://$host:$wsPort/?access_token=$access_token"

if [ $? -ne 0 ]; then
  echo "exit code = $?"
  exit 1
fi

if [ "$mqttVersion" = "311" ]; then
  mqttVersion=4
fi

echo "MQTT over websockets with user/pass qos 2"
node "$testWebsockets" "$CA" "$clientCert" "$clientKey" "$wsProtocol"://"$host:$wsPort/?access_token=$access_token" $user $pass 2 $mqttVersion
echo "exit code = $?"
if [ $? -ne 0 ]; then
  echo "exit code = $?"
  exit 1
fi

echo "MQTT over websockets with user/pass qos 0"
node "$testWebsockets" "$CA" "$clientCert" "$clientKey" "$wsProtocol"://"$host:$wsPort/?access_token=$access_token" $user $pass 0 $mqttVersion

if [ $? -ne 0 ]; then
  echo "exit code = $?"
  exit 1
fi

echo "MQTT over websockets with user/pass qos 0 anonymous"
node "$testWebsockets" "$CA" "$clientCert" "$clientKey" "$wsProtocol"://"$host:$wsPort/?access_token=$access_token" anonymous anonymous 0 $mqttVersion

if [ $? -ne 1 ]; then
  echo "exit code = $?"
  exit 1
fi

access_token=$(curl --cacert $CA --silent -d "client_id=$client_id" -d "client_secret=$client_secret" -d "username=$user" -d "password=$pass" -d "grant_type=password" -d "audience=$audience" -L "$tokenEndpoint" | jq -r ".access_token")
echo "access_token: $access_token"

echo "MQTT over websockets with user/pass qos 2"
node "$testWebsockets" "$CA" "$clientCert" "$clientKey" "$wsProtocol"://"$host:$wsPort/?access_token=$access_token" $access_token "" 2 $mqttVersion

if [ $? -ne 0 ]; then
  echo "exit code = $?"
  exit 1
fi

echo "MQTT over websockets with user/pass qos 0"
node "$testWebsockets" "$CA" "$clientCert" "$clientKey" "$wsProtocol"://"$host:$wsPort/?access_token=$access_token" $access_token "" 0 $mqttVersion

if [ $? -ne 0 ]; then
  echo "exit code = $?"
  exit 1
fi

printf "\n"
echo "Test run successful!"
killSub
exit 0
