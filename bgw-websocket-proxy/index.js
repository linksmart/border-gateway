const config = require('./config');
const logger = require('../logger/log')(config.serviceName, config.logLevel);
const WebSocket = require('ws');
const url = require('url');
const jwt = require('jsonwebtoken');
const getPem = require('rsa-pem-from-mod-exp');
const net = require('net');
const axios = require('axios');
const matchRules = require('./rules');

function noop() {
}

function heartbeat() {
    logger.log("debug", "serverSocket event pong / heartbeat");
    this.isAlive = true;
}

const wsAuth = async (serverSocket, request) => {

    let query = url.parse(request.url, true).query;

    if (query && query.access_token) {
        let decoded;
        let pem = getPem(config.realm_public_key_modulus, config.realm_public_key_exponent);
        try {
            decoded = jwt.verify(query.access_token, pem, {
                audience: config.audience,
                issuer: config.issuer,
                ignoreExpiration: false
            });
        } catch (err) {
            logger.log("error", "Access token is invalid", {errorName: err.name, errorMessage: err.message});
            return false;
        }
        logger.log('debug', 'Successfully decoded access token', {decoded: decoded});
        let issuedAt = new Date(0);
        issuedAt.setUTCSeconds(decoded.iat);
        let expireAt = new Date(0);
        expireAt.setUTCSeconds(decoded.exp);
        serverSocket.bgwExpirationDate = expireAt;
        logger.log('debug', 'Token lifespan', {issuedAt: issuedAt, expireAt: expireAt});

        return true;
    } else if (query) {

        let payload;
        let upstreamURL = new url.URL((config.ws_upstream_base_url.replace(/\/$/, "")) + (url.parse(request.url).pathname || ""));
        payload = `WS/CONNECT/${upstreamURL.hostname}/${upstreamURL.port}${upstreamURL.pathname}/#`;
        payload = payload.replace("//","/");
        logger.log('debug', 'Payload:', {payload: payload});

        let authHeader = undefined;
        if (query.basic_auth) {
            authHeader = {authorization: 'Basic ' + query.basic_auth};
        }

        let response;
        try {
            response = await axios({
                method: 'post',
                headers: authHeader,
                url: config.auth_service + "/authorize",
                data: {
                    rule: payload,
                    openidConnectProviderName: config.openidConnectProviderName || 'default'
                }
            });
        } catch (error) {
            logger.log('error', 'Error in auth-service', {errorName: error.name, errorMessage: error.message});
            return {
                isAuthorized: false,
                error: "Error in auth-service, " + error.name + ": " + error.message
            };
        }

        logger.log("debug", "auth-service response.data", response.data);
        return (response && response.data && response.data.isAuthorized);
    } else {
        return false;
    }
};

function sendMessages(ws, queue) {

    waitForWebSocketConnection(ws, () => {
        logger.log("debug", "Sending messages (ws)", {queue: queue});
        while (queue.length > 0) {
            ws.send(queue.shift());
        }
    });
}

function sendNetMessages(socket, queue) {

    waitForNetSocketConnection(socket, () => {
        logger.log("debug", "Sending messages (net)", {queue: queue});
        while (queue.length > 0) {
            socket.write(queue.shift());
        }
    });
}

function waitForWebSocketConnectionAndAuthorization(socket, callback) {
    setTimeout(
        function () {

            let now = Date.now();
            if (socket.bgwExpirationDate && socket.bgwExpirationDate.getTime() <= now) {
                logger.log("debug", "Closing connection to server because provided access_token has expired.", {
                    bgwExpirationDate: socket.bgwExpirationDate.getTime(),
                    now: now
                });
                socket.close(1008, "Provided access_token has expired.");

                if (socket.bgwClientSocket) {
                    if (socket.bgwClientSocket.constructor.name === "WebSocket") {
                        socket.bgwClientSocket.terminate();
                    } else {
                        socket.bgwClientSocket.destroy();
                    }
                }

                process.nextTick(() => {
                    if ([socket.OPEN, socket.CLOSING].includes(socket.readyState)) {
                        // Socket still hangs, hard close
                        socket.terminate();
                    }
                });
                return;
            }

            if (socket.readyState === 1 && socket.bgwAuthorized) {
                if (callback != null) {
                    callback();
                }
            } else {
                waitForWebSocketConnectionAndAuthorization(socket, callback);
            }

        }, 5); // wait 5 milisecond for the connection...
}

function waitForWebSocketConnection(socket, callback) {
    setTimeout(
        function () {
            if (socket.readyState === 1) {
                if (callback != null) {
                    callback();
                }

            } else {
                waitForWebSocketConnection(socket, callback);
            }

        }, 5); // wait 5 milisecond for the connection...
}

function waitForNetSocketConnection(socket, callback) {
    setTimeout(
        function () {
            if (!socket.connecting) {
                if (callback != null) {
                    callback();
                }
            } else {
                waitForNetSocketConnection(socket, callback);
            }

        }, 5); // wait 5 milisecond for the connection...
}

async function createSocketToUpstream(serverSocket, request) {

    const clientOptions = {
        host: config.mqtt_proxy_host,
        port: config.mqtt_proxy_port
    };

    if (serverSocket.protocol === 'mqtt') {
        serverSocket.bgwClientSocket = net.connect(clientOptions);
        serverSocket.bgwClientSocket.bgwQueue = [];
        serverSocket.bgwClientSocket.on('close', (hadError) => {
            logger.log("debug", "clientSocket (net) event close, hadError = "+hadError);
            serverSocket.close(1011, "Server error. Probably target services is unreachable.");
        });
        serverSocket.bgwClientSocket.on('connect', () => {
            logger.log("debug", "clientSocket (net) event connect");
        });
        serverSocket.bgwClientSocket.on('data', (data) => {
            serverSocket.bgwClientSocket.bgwQueue.push(data);
            logger.log("debug", "clientSocket (net) event data (incoming), forward to serverSocket", {queue: serverSocket.bgwClientSocket.bgwQueue});
            waitForWebSocketConnectionAndAuthorization(serverSocket, () => {
                sendMessages(serverSocket, serverSocket.bgwClientSocket.bgwQueue);
            });
        });
        serverSocket.bgwClientSocket.on('drain', () => {
            logger.log("debug", "clientSocket (net) event drain");
        });
        serverSocket.bgwClientSocket.on('end', () => {
            logger.log("debug", "clientSocket (net) event end");
        });
        serverSocket.bgwClientSocket.on('error', (error) => {
            logger.log("error", "clientSocket (net) event error", {errorMessage: error.message});
        });
        serverSocket.bgwClientSocket.on('lookup', () => {
            logger.log("debug", "clientSocket (net) event lookup");
        });
        serverSocket.bgwClientSocket.on('ready', () => {
            logger.log("debug", "clientSocket (net) event ready");
        });
        serverSocket.bgwClientSocket.on('timeout', () => {
            logger.log("debug", "clientSocket (net) event timeout");
        });
    } else {

        let query;
        try {
            query = await url.parse(request.url, true).query;
        } catch (error) {

            logger.log("error", "URL could not be parsed, terminating", {requestURL: request.url});
            if (serverSocket.bgwClientSocket) {
                serverSocket.bgwClientSocket.terminate();
            }
            serverSocket.terminate();
        }
        delete query.basic_auth;
        delete query.access_token;

        let upstreamURL = new url.URL((config.ws_upstream_base_url.replace(/\/$/, "")) + (url.parse(request.url).pathname || ""));
        upstreamURL.search = new url.URLSearchParams(query);

        logger.log("debug", "Final upstream URL", {URL: upstreamURL.toString()});
        serverSocket.bgwClientSocket = new WebSocket(upstreamURL.toString(), serverSocket.protocol);
        serverSocket.bgwClientSocket.bgwQueue = [];

        serverSocket.bgwClientSocket.on('close', () => {
            logger.log("debug", "clientSocket (ws) event close");
        });

        serverSocket.bgwClientSocket.on('error', (error) => {
            logger.log("error", "clientSocket (ws) event error", {errorMessage: error.message});
        });

        serverSocket.bgwClientSocket.on('message', (data) => {
            serverSocket.bgwClientSocket.bgwQueue.push(data);
            logger.log("debug", "clientSocket (net) event data (incoming), forward to serverSocket", {queue: serverSocket.bgwClientSocket.bgwQueue});
            waitForWebSocketConnectionAndAuthorization(serverSocket, () => {
                sendMessages(serverSocket, serverSocket.bgwClientSocket.bgwQueue);
            });
        });

        serverSocket.bgwClientSocket.on('open', () => {
            logger.log("debug", "clientSocket (ws) event open");
        });

        serverSocket.bgwClientSocket.on('ping', () => {
            logger.log("debug", "clientSocket (ws) event ping");
        });

        serverSocket.bgwClientSocket.on('pong', () => {
            logger.log("debug", "clientSocket (ws) event pong");
        });

        serverSocket.bgwClientSocket.on('unexpected-response', () => {
            logger.log("debug", "clientSocket (ws) event unexpected-response");
        });

        serverSocket.bgwClientSocket.on('upgrade', () => {
            logger.log("debug", "clientSocket (ws) event upgrade");
        });

    }
}

function verifyClient(info) {
    logger.log("debug", "verifyClient", {infoReqUrl: info.req.url});

    if (config.no_auth) {
        return true;
    }

    let query = url.parse(info.req.url, true).query;

    if (query && !query.access_token) {
        return true;
    }

    let access_token;
    if (query) {
        access_token = query.access_token
    }
    let payload;
    let upstreamURL = new url.URL((config.ws_upstream_base_url.replace(/\/$/, "")) + (url.parse(info.req.url).pathname || ""));

    if (info.req.headers["sec-websocket-protocol"] === "mqtt") {
        payload = `WS/CONNECT/${config.mqtt_proxy_host}/${config.mqtt_proxy_port}/#`;
    } else {
        payload = `WS/CONNECT/${upstreamURL.hostname}/${upstreamURL.port}${upstreamURL.pathname}/#`;
        payload = payload.replace("//","/");
    }
    logger.log('debug', 'Payload:', {payload: payload});
    let profile = {};

    let decoded;
    let pem = getPem(config.realm_public_key_modulus, config.realm_public_key_exponent);
    try {
        decoded = jwt.verify(access_token, pem, {
            audience: config.audience,
            issuer: config.issuer,
            ignoreExpiration: false
        });
    } catch (err) {
        logger.log("error", "Access token is invalid", {errorName: err.name, errorMessage: err.message});
        return false;
    }

    if (decoded) {
        logger.log("debug", "Decoded access token", {decoded: decoded});

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
        } else {
            profile.user_id = decoded.preferred_username || decoded.sub;
            profile.rules = rules;
            let source = `[source:${info.req.connection.remoteAddress}:${info.req.connection.remotePort}]`;
            return (matchRules(profile, payload, source)).status;
        }
    } else {
        return false;
    }
}

logger.log("debug", "Creating server " + config.bind_address + " " + config.bind_port);
const wss = new WebSocket.Server({host: config.bind_address, port: config.bind_port, verifyClient: verifyClient});

wss.on('close', function close() {
    logger.log("debug", "sever event close");
});

wss.on('connection', function connection(serverSocket, request) {
    logger.log("debug", "server event connection");

    serverSocket.isAlive = true;
    serverSocket.bgwAuthorized = false;
    serverSocket.bgwClientSocket = undefined;
    serverSocket.bgwQueue = [];

    serverSocket.on('message', (data) => {
        serverSocket.bgwQueue.push(data);

        waitForWebSocketConnectionAndAuthorization(serverSocket, () => {

            if (serverSocket.protocol === 'mqtt') {
                logger.log("debug", "serverSocket event message, forward to clientSocket (net)", {queue: serverSocket.bgwQueue});
                sendNetMessages(serverSocket.bgwClientSocket, serverSocket.bgwQueue);
            } else {

                logger.log("debug", "serverSocket event message, forward to clientSocket (ws)", {queue: serverSocket.bgwQueue});
                sendMessages(serverSocket.bgwClientSocket, serverSocket.bgwQueue);
            }
        });
    });


    serverSocket.on('close', function close() {
        logger.log("debug", "serverSocket event close");
    });

    serverSocket.on('error', function error(error) {
        logger.log("error", "serverSocket event error", {errorMessage: error.message});
    });

    serverSocket.on('open', function open() {
        logger.log("debug", "serverSocket event open");
    });

    serverSocket.on('ping', function ping(data) {
        logger.log("debug", "serverSocket event ping");
    });

    serverSocket.on('pong', heartbeat);

    serverSocket.on('unexpected-response', function unexpectedResponse(request, response) {
        logger.log("debug", "serverSocket event unexpected-response");
    });

    serverSocket.on('upgrade', function upgrade(response) {
        logger.log("debug", "serverSocket event upgrade");
    });
    if (config.no_auth) {
        serverSocket.bgwAuthorized = true;
        logger.log("debug", "Authorized because of no_auth");
        createSocketToUpstream(serverSocket, request);
    } else {
        wsAuth(serverSocket, request).then(result => {
            if (result) {
                serverSocket.bgwAuthorized = true;
                logger.log("debug", "Authorized because of auth-service");
                createSocketToUpstream(serverSocket, request);
            } else {
                logger.log("debug", "Not Authorized, terminating.");

                if (serverSocket.bgwClientSocket) {
                    serverSocket.bgwClientSocket.terminate()
                }
                serverSocket.close(1008, "Not Authorized, terminating socket.");

                process.nextTick(() => {
                    if ([serverSocket.OPEN, serverSocket.CLOSING].includes(serverSocket.readyState)) {
                        // Socket still hangs, hard close
                        serverSocket.terminate();
                    }
                });
            }
        });
    }
})
;

const interval = setInterval(function ping() {
    wss.clients.forEach(function each(ws) {
        if (ws.isAlive === false) return ws.terminate();

        ws.isAlive = false;
        ws.ping(noop);
    });
}, 3000);

wss.on('error', function error(err) {
    logger.log("error", "server event error", {error: err});
});

wss.on('headers', function headers(headers, request) {
    logger.log("debug", "server event headers");
});

wss.on('listening', function listening() {
    logger.log("debug", "server event listening");
});

