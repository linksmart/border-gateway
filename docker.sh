#!/bin/bash

if [ "$1" = "build" ]; then
    echo Building the dependencies for all components...
    npm install --only=dev
    cd dev/iot-bgw-external-interface && git checkout master && npm install && cd ../..
    cd dev/iot-bgw-auth-server && git checkout master && npm install && cd ../..
    cd dev/iot-bgw-mqtt-proxy && git checkout master && npm install && cd ../..
    cd dev/iot-bgw-http-proxy && git checkout master && npm install && cd ../..
    cd dev/iot-bgw-aaa-client && git checkout master && npm install && cd ../..
    echo Finished building the dependencies for all components
    exit 0
fi


if [ "$1" = "part" ]; then

    node json2env.js && \
    node -r dotenv/config ./node_modules/iot-bgw-$2/index.js dotenv_config_path=./node_modules/config.env

elif [ "$1" = "http2https" ]; then

    node json2env.js && \
    node -r dotenv/config http2https.js dotenv_config_path=./node_modules/config.env

else

    trap './node_modules/.bin/forever stopall ; exit 0' INT

    node json2env.js && \
    ./node_modules/.bin/forever --minUptime=1000 --spinSleepTime=1000 run$1.json --colors  dotenv_config_path=./node_modules/config.env &

    while true
    do
        sleep 1
    done

fi
