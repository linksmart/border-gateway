const config = require('./config');
const logger = require('../logger/log')(config.serviceName, config.logLevel);
const WebSocket = require('ws');
const url = require('url');
const jwt = require('jsonwebtoken');
const getPem = require('rsa-pem-from-mod-exp');
const net = require('net');
const matchRules = require('./rules');

function sendMessage(ws, msg) {
    waitForSocketConnection(ws, function () {
        logger.log("debug","Send message from clientSocket to serverSocket");
        ws.send(msg);
    });
}

function sendNetMessage(socket, msg) {
    logger.log("debug","Send message from serverSocket to clientSocket");
    socket.write(msg);
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

function createSocketToUpstream(serverSocket) {

    const clientOptions = {
        host: config.upstream_host,
        port: config.upstream_port
    };

    const clientSocket = net.connect(clientOptions);

    clientSocket.on('close', function close() {
        logger.log("debug","clientSocket event close");
    });

    clientSocket.on('connect', function open() {
        logger.log("debug","clientSocket event connect");
    });

    clientSocket.on('data', function incoming(data) {
        logger.log("debug","clientSocket event data (incoming), forward to serverSocket",{data:data});
        sendMessage(serverSocket, data);

    });

    clientSocket.on('drain', function drain() {
        logger.log("debug","clientSocket event drain");
    });

    clientSocket.on('end', function end() {
        logger.log("debug","clientSocket event end");
    });

    clientSocket.on('error', function error(error) {
        logger.log("error","clientSocket event error",{errorMessage:error.message});
    });

    clientSocket.on('lookup', function lookup() {
        logger.log("debug","clientSocket event lookup");
    });

    clientSocket.on('ready', function ready() {
        logger.log("debug","clientSocket event ready");
    });

    clientSocket.on('timeout', function timeout() {
        logger.log("debug","clientSocket event timeout");
    });

    return clientSocket;
}

function verifyClient(info) {

    if (config.no_auth || (config.no_auth_mqtt && (info.req.headers['sec-websocket-protocol'] === "mqtt"))) {
        return true;
    }

    let query = url.parse(info.req.url,true).query;

    let accessToken;
    if(query) {
        accessToken = query.access_token
    }

    const payload = `WS/CONNECT/${config.upstream_host}/${config.upstream_port}`;
    let profile = {};

    let decoded;
    let pem = getPem(config.realm_public_key_modulus, config.realm_public_key_exponent);
    try {
        decoded = jwt.verify(accessToken, pem, {
            audience: config.client_id,
            issuer: config.issuer,
            ignoreExpiration: false
        });
    }
    catch (err) {
        logger.log("error","Access token is invalid",{errorName:err.name,errorMessage:err.message});
        return false;
    }

    if (decoded) {
        logger.log("debug","Decoded access token",{decoded: decoded});

        let hasRules = false;
        let rules = [];
        for (let property in decoded) {
            if (decoded.hasOwnProperty(property)) {

                if (property.includes("bgw_rules")) {
                    hasRules = true;
                    rules = rules.concat(decoded[property].split(" "));
                }

            }
        }

        if (!hasRules) {
            return false;
        }
        else {
            profile.user_id = decoded.preferred_username;
            profile.rules = rules;
            let source = `[source:${info.req.connection.remoteAddress}:${info.req.connection.remotePort}]`;
            return (matchRules(profile, payload, source)).status;
        }
    }
    else {
        return false;
    }
}

logger.log("debug","Creating server "+config.bind_address+" "+config.bind_port);
const wss = new WebSocket.Server({host: config.bind_address, port: config.bind_port, verifyClient: verifyClient});

wss.on('close', function close() {
    logger.log("debug","sever event close");
});

wss.on('connection', function connection(serverSocket, request) {
    logger.log("debug","server event connection");

    let clientSocket = createSocketToUpstream(serverSocket);

    serverSocket.on('close', function close() {
        logger.log("debug","serverSocket event close");
    });

    serverSocket.on('error', function error(error) {
        logger.log("error","serverSocket event error",{errorMessage:error.message});
    });

    serverSocket.on('message', function incoming(message) {
        logger.log("debug","serverSocket event message, forward to clientSocket", {forwardedMessage: message});
        sendNetMessage(clientSocket, message);
    });

    serverSocket.on('open', function open() {
        logger.log("debug","serverSocket event open");
    });

    serverSocket.on('ping', function ping(data) {
        logger.log("debug","serverSocket event ping");
    });

    serverSocket.on('pong', function pong(data) {
        logger.log("debug","serverSocket event pong");
    });

    serverSocket.on('unexpected-response', function unexpectedResponse(request, response) {
        logger.log("debug","serverSocket event unexpected-response");
    });

    serverSocket.on('upgrade', function upgrade(response) {
        logger.log("debug","serverSocket event upgrade");
    });
});

wss.on('error', function error(err) {
    logger.log("error","server event error",{error: err});
});

wss.on('headers', function headers() {
    logger.log("debug","server event headers");
});

wss.on('listening', function listening() {
    logger.log("debug","server event listening");
});

