#!/bin/bash

if [ $1 = "build" ]; then
    echo Building the dependencies for all components...
    npm install --prefix ./dev/iot-bgw-external-interface ./dev/iot-bgw-external-interface 
    npm install --prefix ./dev/iot-bgw-auth-server ./dev/iot-bgw-auth-server 
    npm install --prefix ./dev/iot-bgw-mqtt-proxy ./dev/iot-bgw-mqtt-proxy 
    npm install --prefix ./dev/iot-bgw-http-proxy ./dev/iot-bgw-http-proxy 
    npm install --prefix ./dev/iot-bgw-aaa-client ./dev/iot-bgw-aaa-client 
    echo Finished building the dependencies for all components
    exit 0
fi

trap './node_modules/.bin/forever stopall ; exit 0' INT

node json2env.js && \
./node_modules/.bin/forever --minUptime=1000 --spinSleepTime=1000 run$1.json --colors  dotenv_config_path=./node_modules/config.env &

while true
do
    sleep 1
done
