#!/bin/bash

trap 'echo "existing docker..."; ./node_modules/.bin/forever stopall ; exit 0' INT


npm run $1 &
./node_modules/.bin/forever run$1.json --colors dotenv_config_path=./config/config$1.env

while true
do
    sleep 1
done
