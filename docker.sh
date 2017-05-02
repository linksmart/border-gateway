#!/bin/bash

trap 'echo "existing docker..."; ./node_modules/.bin/forever stopall ; exit 0' INT


npm run $1 &

while true
do
    sleep 1
done
