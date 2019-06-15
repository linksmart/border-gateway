const WebSocket = require('ws');
const logger = require('../../logger/log')("generic_websocket", "debug");
const fs = require('fs');
const https = require('https');
const winston = require('winston')
let agentOptions;
let agent;

function heartbeat() {
    logger.log("debug", "client heartbeat");
    clearTimeout(this.pingTimeout);

    // Use `WebSocket#terminate()` and not `WebSocket#close()`. Delay should be
    // equal to the interval at which your server sends out pings plus a
    // conservative assumption of the latency.
    this.pingTimeout = setTimeout(() => {
        this.terminate();
    }, 3000 + 1000);
}


function waitForSocketConnection(socket, callback) {
    setTimeout(
        function () {
            if (socket.readyState === 1) {
                if (callback != null) {
                    callback();
                }
                return;

            } else {
                waitForSocketConnection(socket, callback);
            }

        }, 5); // wait 5 milisecond for the connection...
}

function sendPing(ws) {
    waitForSocketConnection(ws, function () {
        ws.ping();
    });
}


let caPath = process.argv[2];

agentOptions = {
    ca: fs.readFileSync(caPath)//,
    //rejectUnauthorized: false
};

agent = new https.Agent(agentOptions);
let url = process.argv[3];
logger.log('debug', 'Starting generic_websocket', {
    ca: caPath,
    url: url
})

let ws;

if (url.includes('wss:')) {
    ws = new WebSocket(url, null, {agent: agent});
} else {
    ws = new WebSocket(url, null);
}

ws.on('close', function close() {
    logger.log("debug", "ws event close", {closeCode: this._closeCode});
    clearTimeout(this.pingTimeout);
    if(this._closeCode === 1008 || this._closeCode === 1006) {
        process.exit(1);
    }
    else{
        process.exit(0)
    }
});

ws.on('error', function close(error, reason) {
    logger.log('error', 'Websocket connection closed', {
        errorMessage: error.message,
        reason: reason
    });
    process.exit(1);
});

ws.on('message', function incoming(data) {

    logger.log("debug", "ws event message", {data: data});
});
ws.on('open', heartbeat);

ws.on('ping', heartbeat);

ws.on('pong', function pong() {
    logger.log('info', 'Pong received', {});
});

ws.on('unexpected-response', function unexpectedResponse(request, response) {
    logger.log("debug", "ws event unexpected-response",{responseStatusCode:response.statusCode,responseStatusMessage:response.statusMessage});
    process.exit(1);
});

ws.on('upgrade', function upgrade(response) {
    logger.log("debug", "ws event upgrade");
});


sendPing(ws);
sendMessage(ws, "hello world");
const interval = setInterval(function send() {
    sendMessage(ws, "now "+(Math.floor(Date.now()) / 1000));
}, 100);
let iterations = 0;

function sendMessage(ws, data) {
    waitForSocketConnection(ws, function () {

        if (iterations == 10) {
            clearInterval(interval);
            sendMessage(ws, "bye world");
            setTimeout(()=>{ process.exit(0); }, 500);

        }

        ws.send(data, function ack(error) {
            if (error) {
                logger.log('error', 'Error while sending message', {
                    errorMessage: error.message
                });
            } else {
                logger.log("debug", 'Message sent ok');
            }
        });
        iterations++;

    });
}
