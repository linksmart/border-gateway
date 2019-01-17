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
if [ "$1" = "parts" ]; then

     json2env
     debugPort=9227
     for var in "$@"
     do
        if [ "$var" != "parts" ]; then
            echo "$var"
            #run_service "$var" &
            run_inspect_service "$var" $debugPort &
            debugPort=$((debugPort + 1))
        fi
     done

elif [ "$1" = "start" ]; then

    json2env
    #export NODE_DEBUG=cluster,net,http,fs,tls,module,timers node
    #export NODE_DEBUG=net,http,tls node

    #run_service bgw-http-proxy &
    run_inspect_service bgw-http-proxy 9227 &
    #run_service bgw-mqtt-proxy &
    run_inspect_service bgw-mqtt-proxy 9228 &
    #run_service bgw-mqtt-proxy &
    run_inspect_service bgw-websocket-proxy 9229 &
    #run_service bgw-auth-service &
    run_inspect_service bgw-auth-service 9230 &
    #run_service bgw-external-interface &
    run_inspect_service bgw-external-interface 9231 &

else
  echo
  echo choose the correct bgw option
  echo
  echo -e  '\t'     bgw start            '\t\t\t\t' Start the bgw in default mode with external interface
  echo
  echo -e  '\t'     bgw start benchmark  '\t\t\t' Start all bgw components plus duplicates http and mqtt proxy
  echo
  echo -e  '\t'     bgw parts \$part_name   '\t\t\t' used to start a list of services e.g. \(bgw-mqtt-proxy or http2https\) good for docker compose
  echo
  echo -e  '\t'     bgw dev                '\t\t\t\t' Start bgw in dev mode using nodemon with reload on change
  echo
  echo -e  '\t'     bgw build                '\t\t\t\t' Build dev dependencies for dev mode
  echo
  exit 1
fi

wait