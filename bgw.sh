#!/bin/sh

run_service() {
  node "./$1/index.js" || kill -KILL 0
}

run_inspect_service() {
  node --inspect="0.0.0.0:$2" "./$1/index.js" || kill -KILL 0
}

# export NODE_DEBUG=cluster,net,http,fs,tls,module,timers
# export NODE_DEBUG=net,http,tls

help() {
    cat <<End-of-message
    Usage: $0 COMMAND [ARGS]

    Commands:
        start       Start the bgw in default mode with external interface
        parts <service> [<service> ...]
                    used to start a list of services e.g. (bgw-mqtt-proxy or http2https)
End-of-message
}

parts() {
     debugPort=9227
     for var in "$@"
     do
        #run_service "$var" &
        run_inspect_service "$var" $debugPort &
        echo "Started service $var with debug port $debugPort"
        debugPort=$((debugPort + 1))
     done
}

start() {
    run_inspect_service bgw-auth-service 9232 &
    run_inspect_service bgw-configuration-service 9230 &
    run_inspect_service bgw-http-proxy 9227 &
    run_inspect_service bgw-mqtt-proxy 9228 &
    run_inspect_service bgw-websocket-proxy 9231 &
    run_inspect_service bgw-external-interface 9233 &
}

main() {
    echo "Starting LinkSmart Border Gateway..."

    if [ "$1" = "parts" ]; then
         shift
         parts "$@"
    elif [ "$1" = "start" ]; then
        start
    else
        help
        exit 1
    fi
    wait
}

main "$@"
