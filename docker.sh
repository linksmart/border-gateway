#!/bin/bash

dontexit = true
trap 'echo "existing docker..."; ./node_modules/.bin/forever stopall ; dontexit=false; echo "dont exist false"' INT


#npm run $1 &
./node_modules/.bin/forever run$1.json --colors dotenv_config_path=./config/config$1.env &

while $dontexit
do
    sleep 1
done
