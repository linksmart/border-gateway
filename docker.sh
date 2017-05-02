#!/bin/bash

dontexit = true
trap './node_modules/.bin/forever stopall ; let dontexit=false' INT

./node_modules/.bin/forever run$1.json --colors dotenv_config_path=./config/config$1.env &

while $dontexit
do
    sleep 1
done
