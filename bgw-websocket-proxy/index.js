const config = require('./config');
const WebSocket = require('ws');
const url = require('url');
const jwt = require('jsonwebtoken');
const getPem = require('rsa-pem-from-mod-exp');
const net = require('net');
const {AAA, CAT} = require('../bgw-aaa-client');
const matchRules = require('./rules');

function sendMessage(ws, msg) {
    waitForSocketConnection(ws, function () {
        AAA.log(CAT.DEBUG, 'websocket-proxy', "Send message from clientSocket to serverSocket");
        ws.send(msg);
    });
}

function sendNetMessage(socket, msg) {
    AAA.log(CAT.DEBUG, 'websocket-proxy', "Send message from serverSocket to clientSocket");
    socket.write(msg);
}

function waitForSocketConnection(socket, callback) {
    setTimeout(
        function () {
            if (socket.readyState === 1) {
                //AAA.log(CAT.DEBUG, 'websocket-proxy', "Connection is made");
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
        AAA.log(CAT.DEBUG, 'websocket-proxy', "clientSocket event close");
    });

    clientSocket.on('connect', function open() {
        AAA.log(CAT.DEBUG, 'websocket-proxy', "clientSocket event connect");

    });

    clientSocket.on('data', function incoming(data) {
        AAA.log(CAT.DEBUG, 'websocket-proxy', "clientSocket event data (incoming), forward to serverSocket", data);
        sendMessage(serverSocket, data);

    });

    clientSocket.on('drain', function drain() {
        AAA.log(CAT.DEBUG, 'websocket-proxy', "clientSocket event drain");
    });

    clientSocket.on('end', function end() {
        AAA.log(CAT.DEBUG, 'websocket-proxy', "clientSocket event end");
    });

    clientSocket.on('error', function error(error) {
        AAA.log(CAT.DEBUG, 'websocket-proxy', "clientSocket event error", error.message);
    });

    clientSocket.on('lookup', function lookup() {
        AAA.log(CAT.DEBUG, 'websocket-proxy', "clientSocket event lookup");
    });

    clientSocket.on('ready', function ready() {
        AAA.log(CAT.DEBUG, 'websocket-proxy', "clientSocket event ready");
    });

    clientSocket.on('timeout', function timeout() {
        AAA.log(CAT.DEBUG, 'websocket-proxy', "clientSocket event timeout");
    });

    return clientSocket;
}

function verifyClient(info) {

    if (config.no_auth || (config.no_auth_mqtt && (info.req.headers['sec-websocket-protocol'] === "mqtt"))) {
        return true;
    }

    //let protocols;
    //if (info.req.headers['sec-websocket-protocol']) {
    //    protocols = info.req.headers['sec-websocket-protocol'].split(', ');
    //}
    //else {
    //    return false;
    //}
    //let accessToken = protocols[protocols.length - 1];
    let query = url.parse(info.req.url,true).query;

    let accessToken;
    if(query) {
        accessToken = query.access_token
    }
    //AAA.log(CAT.DEBUG, 'websocket-proxy', "accessToken", accessToken);

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
        AAA.log(CAT.INVALID_ACCESS_TOKEN, 'websocket-proxy', "Access token is invalid", err.name, err.message);
        return false;
    }

    if (decoded) {
        AAA.log(CAT.DEBUG, 'websocket-proxy', "Decoded access token:\n", decoded);

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

AAA.log(CAT.DEBUG, 'websocket-proxy', "Creating server",config.bind_address,config.bind_port);
const wss = new WebSocket.Server({host: config.bind_address, port: config.bind_port, verifyClient: verifyClient});

wss.on('close', function close() {
    AAA.log(CAT.DEBUG, 'websocket-proxy', "sever event close");
});

wss.on('connection', function connection(serverSocket, request) {
    AAA.log(CAT.DEBUG, 'websocket-proxy', "server event connection");


    let clientSocket = createSocketToUpstream(serverSocket);

    serverSocket.on('close', function close() {
        AAA.log(CAT.DEBUG, 'websocket-proxy', "serverSocket event close");
    });

    serverSocket.on('error', function error(error) {
        AAA.log(CAT.DEBUG, 'websocket-proxy', 'serverSocket event error', error.message);
    });

    serverSocket.on('message', function incoming(message) {
        AAA.log(CAT.DEBUG, 'websocket-proxy', 'serverSocket event message, forward to clientSocket', message);
        sendNetMessage(clientSocket, message);
    });

    serverSocket.on('open', function open() {
        AAA.log(CAT.DEBUG, 'websocket-proxy', "serverSocket event open");
    });

    serverSocket.on('ping', function ping(data) {
        AAA.log(CAT.DEBUG, 'websocket-proxy', "serverSocket event ping",data);
    });

    serverSocket.on('pong', function pong(data) {
        AAA.log(CAT.DEBUG, 'websocket-proxy', "serverSocket event pong",data);
    });

    serverSocket.on('unexpected-response', function unexpectedResponse(request, response) {
        AAA.log(CAT.DEBUG, 'websocket-proxy', "serverSocket event unexpected-response");
    });

    serverSocket.on('upgrade', function upgrade(response) {
        AAA.log(CAT.DEBUG, 'websocket-proxy', 'serverSocket event upgrade');
    });
});

wss.on('error', function error(err) {
    AAA.log(CAT.DEBUG, 'websocket-proxy', "sever event error",err);
});

wss.on('headers', function headers() {
    AAA.log(CAT.DEBUG, 'websocket-proxy', "sever event headers");
});

wss.on('listening', function listening() {
    AAA.log(CAT.DEBUG, 'websocket-proxy', "sever event listening");
});

