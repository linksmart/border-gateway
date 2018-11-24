#!/bin/bash

function run_service {
  node -r dotenv/config ./node_modules/$1/index.js dotenv_config_path=./node_modules/config.env || kill -KILL 0
}
function run_inspect_service {
  node --inspect=0.0.0.0:$2 -r dotenv/config ./node_modules/$1/index.js dotenv_config_path=./node_modules/config.env || kill -KILL 0
}

function json2env {
  node json2env.js || exit 1
}
if [ "$1" = "part" ]; then

    json2env
    #run_service $2
    run_inspect_service $2 9228 &

elif [ "$1" = "start" ]; then

    json2env
    #export NODE_DEBUG=cluster,net,http,fs,tls,module,timers node
    #export NODE_DEBUG=net,http,tls node
    #run_service http2https &
    #run_service bgw-auth-server &

    #run_service bgw-auth-service &
    run_inspect_service bgw-auth-service 9231 &

    #run_service bgw-http-proxy &
    run_inspect_service bgw-http-proxy 9228 &

    #run_service bgw-mqtt-proxy &
    run_inspect_service bgw-mqtt-proxy 9229 &

    #run_service bgw-mqtt-proxy &
    run_inspect_service bgw-websocket-proxy 9230 &

else
  echo
  echo choose the correct bgw option
  echo
  echo -e  '\t'     bgw start            '\t\t\t\t' Start the bgw in default mode with external interface
  echo
  echo -e  '\t'     bgw start disable_ei  '\t\t\t' Start the bgw without external interface
  echo
  echo -e  '\t'     bgw start benchmark  '\t\t\t' Start all bgw components plus duplicates http and mqtt proxy
  echo
  echo -e  '\t'     bgw part \$part_name   '\t\t\t' used to start a single service e.g. \(bgw-mqtt-proxy or http2https\) good for docker compose
  echo
  echo -e  '\t'     bgw dev                '\t\t\t\t' Start bgw in dev mode using nodemon with reload on change
  echo
  echo -e  '\t'     bgw build                '\t\t\t\t' Build dev dependencies for dev mode
  echo
  exit 1
fi

wait