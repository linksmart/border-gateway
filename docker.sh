#!/bin/bash

trap 'npm run stop && exit 0' INT

npm run $1 &

while true
do
    sleep 1
done
