const config = require('./config');
const logger = require('../logger/log')(config.serviceName, config.logLevel);
const net = require('net');
const tls = require('tls');
const shortid = require('shortid');
const mqtt = require('mqtt-packet');
const validate = require('./validate');

function waitUntilEmpty(packetSet, callback, counter) {
    setTimeout(
        function () {
            if (packetSet.size === 0) {
                logger.log('debug', 'disconnect can be forwarded');
                if (callback != null) {
                    callback();
                }


            } else {
                counter++;
                if ((counter % 1000) === 0) {
                    logger.log('debug', "waiting for %d seconds before disconnect can be forwarded: ", counter / 1000);
                }
                waitUntilEmpty(packetSet, callback, counter);
            }

        }, 5); // wait 5 miliseconds
}

async function wrappedValidate(clientAddress, packet, credentials) {
    try {
        logger.log('debug', "Validating", {packet: packet.cmd});
        return await validate.validate(clientAddress, packet, credentials);
    } catch (err) {
        logger.log('error', "Error when validating", {error: err});
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

const server = net.createServer(serverOptions, (srcClient) => {

    const socketConnect = broker.tls ? tls.connect : net.connect;
    const dstClient = socketConnect(clientOptions, () => {
        const srcParser = mqtt.parser();
        const dstParser = mqtt.parser();

        srcClient.on('data', (data) => {
            try {
                srcParser.parse(data);
            } catch (err) {
                logger.log('error', "Parse error in srcParser", {error: err});
            }
        });


        config.authorize_response ? dstClient.on('data', (data) => {
            try {
                dstParser.parse(data)
            } catch (err) {
                logger.log('error', "Parse error in dstParser", {error: err});
            }
        }) : dstClient.pipe(srcClient);

        dstClient.on('error', (err) => {
            logger.log('error', "err in dstClient", {error: err});
            srcClient && srcClient.end && srcClient.end();
            dstClient.destroy();
        });
        srcClient.on('error', (err) => {
            logger.log('error', "err in srcClient", {error: err});
            dstClient && dstClient.end && dstClient.end();
            srcClient.destroy();
        });

        const clientAddress = `${srcClient.remoteAddress}:${srcClient.remotePort}`;
        srcClient.credentials = {};
        srcClient.packetSet = new Set([]);

        srcParser.on('packet', (packet) => {
            logger.log('debug', "packet event emitted", {command: packet.cmd});
            let packetID = shortid.generate();

            for (let key in packet) {
                if (packet.hasOwnProperty(key)) {
                    if (key === 'cmd' || key === 'clientId' || key === 'topic') {
                        packetID = packetID + "_" + packet[key];
                    }
                }
            }

            if (packet.cmd !== 'disconnect') {
                srcClient.packetSet.add(packetID);
                logger.log('debug', "srcClient.packetSet", {packetSet: srcClient.packetSet});
            }
            // get the client key and store it
            if (packet.cmd === 'connect') {
                srcClient.credentials = {username: packet.username, password: packet.password && "" + packet.password};

                delete packet.username;
                delete packet.password;
                broker.username && (packet.username = broker.username);
                broker.password && (packet.password = broker.password);
            }

            wrappedValidate(clientAddress, packet, srcClient.credentials).then(result => {
                let valid = result;
                // got final result
                logger.log('debug', "packet validated", {command: packet.cmd});

                valid.packet = valid.packet && mqtt.generate(valid.packet);

                if (valid.status) {

                    if (packet.cmd === 'disconnect') {
                        waitUntilEmpty(srcClient.packetSet, function () {
                            dstClient.write(valid.packet);
                        }, 0);
                    } else {
                        dstClient.write(valid.packet);
                    }
                } else {
                    // if the packet is invalid in the case of publish or subscribe and
                    // configs for disconnecting on unauthorized is set to true, then
                    // disconnect
                    if ((packet.cmd === 'subscribe' && config.disconnect_on_unauthorized_subscribe) ||
                        (packet.cmd === 'publish' && config.disconnect_on_unauthorized_publish)) {
                        logger.log('info', "disconnecting client for unauthorized", {command: packet.cmd});
                        srcClient.destroy();
                        dstClient.destroy();
                    } else {
                        valid.packet && srcClient.write(valid.packet);
                    }
                }
                if (packet.cmd !== 'disconnect') {
                    srcClient.packetSet.delete(packetID);

                }
            }).catch(err => {
                logger.log('error', "Error when validating", {error: err});
                if (packet.cmd !== 'disconnect') {
                    srcClient.packetSet.delete(packetID);
                }
            });
        });
    });
});

config.bind_addresses.forEach((addr) => {
    server.listen(config.bind_port, addr, () =>
        logger.log('info', `${config.serviceName} listening on ${addr}:${config.bind_port}`));
});
