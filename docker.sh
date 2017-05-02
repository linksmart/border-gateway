#!/bin/bash

trap './node_modules/.bin/forever stopall ; exit 0' INT

./node_modules/.bin/forever run$1.json --colors dotenv_config_path=./config/config$1.env &

while true
do
    sleep 1
done
