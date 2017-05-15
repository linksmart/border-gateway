#!/bin/bash

trap './node_modules/.bin/forever stopall ; exit 0' INT

node json2env.js && \
./node_modules/.bin/forever --minUptime=1000 --spinSleepTime=1000 run$1.json --colors  dotenv_config_path=./node_modules/config.env &

while true
do
    sleep 1
done
