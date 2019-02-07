#!/bin/bash

function run_service {
  # node -r dotenv/config ./$1/index.js dotenv_config_path=./node_modules/config.env || kill -KILL 0
  node ./$1/index.js || kill -KILL 0
}
function run_inspect_service {
  # node --inspect=0.0.0.0:$2 -r dotenv/config ./$1/index.js dotenv_config_path=./node_modules/config.env || kill -KILL 0
  node --inspect=0.0.0.0:$2 ./$1/index.js || kill -KILL 0
}

if [ "$1" = "parts" ]; then

     debugPort=9227
     for var in "$@"
     do
        if [ "$var" != "parts" ]; then
            echo "$var"
            #run_service "$var" &
            run_inspect_service "$var" $debugPort &
            echo "Started service $var with debug port $debugPort"
            debugPort=$((debugPort + 1))
        fi
     done

elif [ "$1" = "start" ]; then

    #export NODE_DEBUG=cluster,net,http,fs,tls,module,timers node
    #export NODE_DEBUG=net,http,tls node

    run_inspect_service bgw-http-proxy 9227 &
    run_inspect_service bgw-mqtt-proxy 9228 &
    run_inspect_service bgw-rabbitmq-auth-backend-http 9229 &
    run_inspect_service bgw-configuration-service 9230 &
    run_inspect_service bgw-websocket-proxy 9231 &
    run_inspect_service bgw-auth-service 9232 &
    run_inspect_service bgw-external-interface 9233 &

else
  echo
  echo choose the correct bgw option
  echo
  echo -e  '\t'     bgw start            '\t\t\t\t' Start the bgw in default mode with external interface
  echo
  echo -e  '\t'     bgw parts \$part_name   '\t\t\t' used to start a list of services e.g. \(bgw-mqtt-proxy or http2https\) good for docker compose
  echo
  exit 1
fi

wait