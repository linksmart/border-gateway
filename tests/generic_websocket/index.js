const WebSocket = require('ws');
const https = require('https');
const winston = require('winston')
let agentOptions;
let agent;

const myFormat = winston.format.printf(({ timestamp, label, level, message, metadata }) => {
    return `${timestamp} [${label}] ${level}: ${message} ${JSON.stringify(metadata)}`;
});

const logger = winston.createLogger({
    level: 'debug',
    format: winston.format.combine(
        winston.format.label({ label: 'generic_websocket' }),
        winston.format.timestamp(),
        winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp', 'label'] }),
        myFormat
    ),
    transports: [
        new winston.transports.Console()
    ]
});

agentOptions = {
    rejectUnauthorized: false,
    ca: process.argv[2]
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
let url = process.argv[3];
logger.log('debug', 'Starting generic_websocket', {
    ca: process.argv[2],
    url: url
})

let ws;

if (url.includes('wss:')) {
    ws = new WebSocket(url, null, {agent: agent});
}
else {
    ws = new WebSocket(url, null);
}

ws.on('error', function close(error, reason) {
    logger.log('error', 'Websocket connection closed',{
        error: error,
        reason: reason
    });
    process.exit(1);
});

ws.on('pong', function pong() {
    logger.log('info', 'Pong received',{});
    ws.terminate();
    process.exit(0);
});

sendPing(ws);
sendMessage(ws,"hello")

