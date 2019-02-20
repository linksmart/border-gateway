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
        AAA.log(CAT.DEBUG, 'websocket-proxy', "Send message from net.Socket to WebSocket server");
        ws.send(msg);
    });
}

function sendNetMessage(socket, msg) {
    AAA.log(CAT.DEBUG, 'websocket-proxy', "Send message from net.Socket to WebSocket server");
    socket.write(msg);
}

function waitForSocketConnection(socket, callback) {
    setTimeout(
        function () {
            if (socket.readyState === 1) {
                AAA.log(CAT.DEBUG, 'websocket-proxy', "Connection is made");
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

    const socket = net.connect(clientOptions);

    socket.on('connect', function open() {
        AAA.log(CAT.DEBUG, 'websocket-proxy', "net.Socket to upstream open");

    });

    socket.on('data', function incoming(data) {
        AAA.log(CAT.DEBUG, 'websocket-proxy', "net.Socket from upstream data =  %s", data);
        sendMessage(serverSocket, data);

    });

    socket.on('error', function error(error) {
        AAA.log(CAT.DEBUG, 'websocket-proxy', "net.Socket to upstream error, error.message = %s", error.message);
    });

    socket.on('close', function close() {
        AAA.log(CAT.DEBUG, 'websocket-proxy', "net.Socket to upstream close");
    });

    return socket;
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
    AAA.log(CAT.DEBUG, 'websocket-proxy', "accessToken", accessToken);

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
        AAA.log(CAT.DEBUG, 'websocket-proxy', "typeof decoded:\n", typeof decoded);

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

const wss = new WebSocket.Server({port: config.bind_port, verifyClient: verifyClient});

wss.on('connection', function connection(socket, request) {
    AAA.log(CAT.DEBUG, 'websocket-proxy', "WebSocket from client connection");


    let clientSocket = createSocketToUpstream(socket);

    socket.on('error', function error(error) {
        AAA.log(CAT.DEBUG, 'websocket-proxy', 'WebSocket from client error, error.message = ', error.message);
    });

    socket.on('upgrade', function upgrade(response) {
        AAA.log(CAT.DEBUG, 'websocket-proxy', 'WebSocket from client upgrade');
    });

    socket.on('unexpected-response', function unexpectedResponse(request, response) {
        AAA.log(CAT.DEBUG, 'websocket-proxy', "WebSocket from client unexpected-response");
    });

    socket.on('open', function open() {
        AAA.log(CAT.DEBUG, 'websocket-proxy', "WebSocket from client open");
    });

    socket.on('close', function close() {
        AAA.log(CAT.DEBUG, 'websocket-proxy', "WebSocket from client close");
    });

    socket.on('message', function incoming(data) {
        AAA.log(CAT.DEBUG, 'websocket-proxy', 'WebSocket from client message = %s', data);
        sendNetMessage(clientSocket, data);
    });

});
