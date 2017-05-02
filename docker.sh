#!/bin/bash

trap 'echo "existing docker..."; npm run stop; sleep 3; exit 0' INT

npm run $1 &

while true
do
    sleep 1
done
