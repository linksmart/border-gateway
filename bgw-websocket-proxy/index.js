const config = require('./config');
const WebSocket = require('ws');
let mqttPacket = require('mqtt-packet');
let opts = {protocolVersion: 4};
let net = require('net');
let parser = mqttPacket.parser(opts);
const {AAA, CAT} = require('../bgw-aaa-client');

 parser.on('packet', function (packet) {
     AAA.log(CAT.DEBUG,'websocket-proxy',packet);
 });

function sendMessage(ws, msg) {
    waitForSocketConnection(ws, function () {
        AAA.log(CAT.DEBUG,'websocket-proxy',"Send message from net.Socket to WebSocket server");
        ws.send(msg);
    });
}

function sendNetMessage(socket, msg) {
    AAA.log(CAT.DEBUG,'websocket-proxy',"Send message from net.Socket to WebSocket server");
    socket.write(msg);
}

function waitForSocketConnection(socket, callback) {
    setTimeout(
        function () {
            if (socket.readyState === 1) {
                AAA.log(CAT.DEBUG,'websocket-proxy',"Connection is made");
                if (callback != null) {
                    callback();
                }
                return;

            } else {
                waitForSocketConnection(socket, callback);
            }

        }, 5); // wait 5 milisecond for the connection...
}

function createSocketToBroker(serverSocket) {

    const clientOptions = {
        host: config.mqtt_proxy_ip,
        port: config.mqtt_proxy_port
    };

    const socket = net.connect(clientOptions);

    socket.on('connect', function open() {
        AAA.log(CAT.DEBUG,'websocket-proxy',"net.Socket to Mosquitto open");

    });

    socket.on('data', function incoming(data) {
        AAA.log(CAT.DEBUG,'websocket-proxy',"net.Socket to Mosquitto data =  %s", data);

        parser.parse(data);
        sendMessage(serverSocket, data);
    });

    socket.on('error', function error(error) {
        AAA.log(CAT.DEBUG,'websocket-proxy',"net.Socket to Mosquitto error, error.message = %s", error.message);
    });

    socket.on('close', function close() {
        AAA.log(CAT.DEBUG,'websocket-proxy',"net.Socket to Mosquitto close");
    });

    return socket;
}

const wss = new WebSocket.Server({port: config.bind_port});

wss.on('connection', function connection(socket, request) {
    AAA.log(CAT.DEBUG,'websocket-proxy',"WebSocket from client connection");

    let clientSocket = createSocketToBroker(socket);

    socket.on('error', function error(error) {
        AAA.log(CAT.DEBUG,'websocket-proxy','WebSocket from client error, error.message = ', error.message);
    });

    socket.on('upgrade', function upgrade(response) {
        AAA.log(CAT.DEBUG,'websocket-proxy','WebSocket from client upgrade');
    });

    socket.on('unexpected-response', function unexpectedResponse(request,response) {
        AAA.log(CAT.DEBUG,'websocket-proxy',"WebSocket from client unexpected-response");
    });

    socket.on('open', function open() {
        AAA.log(CAT.DEBUG,'websocket-proxy',"WebSocket from client open");
    });

    socket.on('close', function close() {
        AAA.log(CAT.DEBUG,'websocket-proxy',"WebSocket from client close");
    });

    socket.on('message', function incoming(data) {
        AAA.log(CAT.DEBUG,'websocket-proxy','WebSocket from client message = %s', data);
        parser.parse(data);
        sendNetMessage(clientSocket, data);
    });


});
