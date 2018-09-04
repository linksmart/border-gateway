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
    run_service $2

elif [ "$1" = "start" ]; then

    json2env
    #export NODE_DEBUG=cluster,net,http,fs,tls,module,timers node
    #export NODE_DEBUG=net,http,tls node
    #run_service http2https &
    #run_service bgw-auth-server &

    if [ "$2" = "enable_ei" ]; then

      run_inspect_service bgw-external-interface 9227 &
      #run_service bgw-external-interface &

      #ENABLE_EI=true run_service bgw-http-proxy &
      ENABLE_EI=true run_inspect_service bgw-http-proxy 9228 &
      
      #ENABLE_EI=true run_service bgw-mqtt-proxy &
      ENABLE_EI=true run_inspect_service bgw-mqtt-proxy 9229 &

      #ENABLE_EI=true run_service bgw-mqtt-proxy &
      ENABLE_EI=true run_inspect_service bgw-websocket-proxy 9230 &

    else

      #ENABLE_EI=false run_service bgw-http-proxy &
      ENABLE_EI=false run_inspect_service bgw-http-proxy 9228 &
      
      #ENABLE_EI=false run_service bgw-mqtt-proxy &
      ENABLE_EI=false run_inspect_service bgw-mqtt-proxy 9229 &

      #ENABLE_EI=false run_service bgw-mqtt-proxy &
      ENABLE_EI=false run_inspect_service bgw-websocket-proxy 9230 &
    fi

else
  echo
  echo choose the correct bgw option
  echo
  echo -e  '\t'     bgw start            '\t\t\t\t' Start the bgw in default mode \(no ei\)
  echo
  echo -e  '\t'     bgw start enable_ei  '\t\t\t' Start the bgw with the external interface \(ei\) features
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