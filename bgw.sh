#!/bin/bash

function run_service {
  node -r dotenv/config ./node_modules/$1/index.js dotenv_config_path=./node_modules/config.env || kill -KILL 0
}
function run__dev_service {
  ENABLE_EI=TRUE SINGLE_CORE=TRUE node -r dotenv/config ./node_modules/nodemon/bin/nodemon -w ./dev/iot-bgw-aaa-client -w ./dev/iot-bgw-$1 ./dev/iot-bgw-$1/index.js dotenv_config_path=./node_modules/config.env
}
function json2env {
  node json2env.js || kill -KILL 0
}
if [ "$1" = "build" ]; then
    echo Building the dependencies for all components...
    npm install --only=dev

    npm run clone-external-interface && cd dev/iot-bgw-external-interface && npm install && cd ../..
    npm run clone-auth-server && cd dev/iot-bgw-auth-server && npm install && cd ../..
    npm run clone-mqtt-proxy && cd dev/iot-bgw-mqtt-proxy && npm install && cd ../..
    npm run clone-http-proxy && cd dev/iot-bgw-http-proxy && npm install && cd ../..
    npm run clone-aaa-client && cd dev/iot-bgw-aaa-client && npm install && cd ../..

    chmod -R o+wr .
    echo Finished building the dependencies for all components
    exit 0

elif [ "$1" = "part" ]; then

    json2env
    run_service $2

elif [ "$1" = "service" ]; then

    json2env
    run_service http2https &

    if [ "$2" = "enable_ei" ]; then

      run_service iot-bgw-external-interface &
      ENABLE_EI=TRUE run_service iot-bgw-http-proxy &
      ENABLE_EI=TRUE run_service iot-bgw-mqtt-proxy &

    elif [ "$2" = "benchmark" ]; then
      run_service iot-bgw-external-interface &
      ENABLE_EI=TRUE run_service iot-bgw-http-proxy &
      ENABLE_EI=TRUE run_service iot-bgw-mqtt-proxy &
      HTTP_PROXY_BIND_PORT=5099 run_service iot-bgw-http-proxy &
      MQTT_PROXY_BIND_PORT=5098 run_service iot-bgw-mqtt-proxy &

    else

      run_service iot-bgw-http-proxy &
      run_service iot-bgw-mqtt-proxy &

    fi

    run_service iot-bgw-auth-server &


elif [ "$1" = "dev" ]; then

    json2env
    run_service http2https &
    run__dev_service external-interface &
    run__dev_service http-proxy &
    run__dev_service mqtt-proxy &
    run__dev_service auth-server &

else
  echo
  echo choose the correct bgw option

  echo
  echo -e  '\t'     bgw service            '\t\t\t\t' Run the bgw in default mode \(no ei\)
  echo
  echo -e  '\t'     bgw service enable_ei  '\t\t\t' Run the bgw with the external interface \(ei\) features
  echo
  echo -e  '\t'     bgw service benchmark  '\t\t\t' Run all bgw components plus duplicates http and mqtt proxy
  echo
  echo -e  '\t'     bgw part \$part_name   '\t\t\t' used to run a single service e.g. \(iot-bgw-mqtt-proxy or http2https\)
  echo
  echo -e  '\t'     bgw dev                '\t\t\t\t' Run bgw in dev mode using nodemon with reload on change
  echo
  exit 1
fi

trap 'echo shutting down ; exit 0' INT

while true
do
    sleep 1
done
