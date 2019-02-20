const WebSocket = require('ws');
const https = require('https');
let agentOptions;
let agent;

agentOptions = {
    rejectUnauthorized: false
};

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

function sendMessage(ws,data) {
    waitForSocketConnection(ws, function () {
        ws.send(data);
    });
}

agent = new https.Agent(agentOptions);
let url = process.argv[2];
//let accessToken = process.argv[3];
let ws;

if (url.includes('wss:')) {
    ws = new WebSocket(url, null, {agent: agent});
}
else {
    ws = new WebSocket(url, null);
}

ws.on('error', function close(error, reason) {
    console.log("Websocket connection closed, error", error, "reason", reason);
    process.exit(1);
});

ws.on('pong', function pong() {
    console.log("Pong received");
    ws.terminate();
    process.exit(0);
});

sendPing(ws);
sendMessage(ws,"hello")

