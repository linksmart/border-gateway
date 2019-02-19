const config = require('./config');
const net = require('net');
const tls = require('tls');
const shortid = require('shortid');
const mqtt = require('mqtt-packet');

const {AAA, CAT, debug} = require('../bgw-aaa-client');
const validate = require('./validate');

let packetSet = new Set([]);

function waitUntilEmpty(packetSet, callback, counter) {
    setTimeout(
        function () {
            if (packetSet.size === 0) {
                AAA.log(CAT.DEBUG, 'mqtt-proxy', "disconnect can be forwarded");
                if (callback != null) {
                    callback();
                }


            } else {
                counter++;
                if ((counter % 1000) === 0) {
                    AAA.log(CAT.DEBUG, 'mqtt-proxy', "waiting for %d seconds before disconnect can be forwarded: ", counter / 1000);
                }
                waitUntilEmpty(packetSet, callback, counter);
            }

        }, 5); // wait 5 miliseconds
}

async function wrappedValidate(clientAddress, packet, credentials) {
    try {
        return await validate.validate(clientAddress, packet, credentials);
    } catch (err) {
        AAA.log(CAT.BUG, 'mqtt-proxy', "err when validating", err);
        return {status: false};
    }
}

const serverOptions = {};
const broker = config.broker;
const clientOptions = {
    host: broker.address,
    port: broker.port,
    ca: broker.tls && broker.tls_ca && [fs.readFileSync(broker.tls_ca)],
    key: broker.tls && broker.tls_client_key && fs.readFileSync(broker.tls_client_key),
    cert: broker.tls && broker.tls_client_cert && fs.readFileSync(broker.tls_client_cert)
};

AAA.log(CAT.PROCESS_START, 'mqtt-proxy', "Creating mqtt-proxy server...");
const server = net.createServer(serverOptions, (srcClient) => {

    const socketConnect = broker.tls ? tls.connect : net.connect;
    const dstClient = socketConnect(clientOptions, () => {
        const srcParser = mqtt.parser();
        const dstParser = mqtt.parser();

        srcClient.on('data', (data) => {
            try {
                srcParser.parse(data);
            }
            catch (err) {
                AAA.log(CAT.DEBUG, 'mqtt-proxy', "Parse error in srcParser", err);
            }
        });


        config.authorize_response ? dstClient.on('data', (data) => {
            try {
                dstParser.parse(data)
            }
            catch (err) {
                AAA.log(CAT.DEBUG, 'mqtt-proxy', "Parse error in dstParser", err);
            }
        }) : dstClient.pipe(srcClient);

        dstClient.on('error', (err) => {
            debug('err in dstClient', err);
            srcClient && srcClient.end && srcClient.end();
            dstClient.destroy();
        });
        srcClient.on('error', (err) => {
            debug('err in srcClient', err);
            dstClient && dstClient.end && dstClient.end();
            srcClient.destroy();
        });

        const clientAddress = `${srcClient.remoteAddress}:${srcClient.remotePort}`;
        let credentials = {};

        srcParser.on('packet', (packet) => {
            AAA.log(CAT.DEBUG, 'mqtt-proxy', "packet event emitted", packet.cmd);
            let packetID = shortid.generate();

            for (let key in packet) {
                if (packet.hasOwnProperty(key)) {
                    if (key === 'cmd' || key === 'clientId' || key === 'topic') {
                        packetID = packetID + "_" + packet[key];
                    }
                }
            }

            if (packet.cmd !== 'disconnect') {
                packetSet.add(packetID);
                AAA.log(CAT.DEBUG, 'mqtt-proxy', "packetSet", packetSet);
            }
            // get the client key and store it
            if (packet.cmd === 'connect') {
                credentials = {username: packet.username, password: packet.password && "" + packet.password};

                delete packet.username;
                delete packet.password;
                broker.username && (packet.username = broker.username);
                broker.password && (packet.password = broker.password);
            }

            wrappedValidate(clientAddress, packet, credentials).then(result => {
                let valid = result;
                // got final result
                AAA.log(CAT.DEBUG, 'mqtt-proxy', 'packet validated', packet.cmd);

                valid.packet = valid.packet && mqtt.generate(valid.packet);

                if (valid.status) {

                    if (packet.cmd === 'disconnect') {
                        waitUntilEmpty(packetSet, function () {
                            dstClient.write(valid.packet);
                        }, 0);
                    }
                    else {
                        dstClient.write(valid.packet);
                    }
                }
                else {
                    // if the packet is invalid in the case of publish or subscribe and
                    // configs for disconnecting on unauthorized is set to true, then
                    // disconnect
                    if ((packet.cmd === 'subscribe' && config.disconnect_on_unauthorized_subscribe) ||
                        (packet.cmd === 'publish' && config.disconnect_on_unauthorized_publish)) {
                        AAA.log(CAT.CON_TERMINATE, 'mqtt-proxy', 'disconnecting client for unauthorized ', packet.cmd);
                        srcClient.destroy();
                        dstClient.destroy();
                    } else {
                        valid.packet && srcClient.write(valid.packet);
                    }
                }
                if (packet.cmd !== 'disconnect') {
                    packetSet.delete(packetID);

                }
            }).catch(err => {
                AAA.log(CAT.BUG, 'mqtt-proxy', "error when validating", err);
                if (packet.cmd !== 'disconnect') {
                    packetSet.delete(packetID);
                }
            });
        });
    });
});

config.bind_addresses.forEach((addr) => {
    server.listen(config.bind_port, addr, () =>
        AAA.log(CAT.PROCESS_START, 'mqtt-proxy', `PID ${process.pid} listening on ${addr}:${config.bind_port}`));
});
