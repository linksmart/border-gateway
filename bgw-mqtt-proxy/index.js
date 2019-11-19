const config = require('./config');
const logger = require('../logger/log')(config.serviceName, config.logLevel);
const tracer = require('../tracer/trace').jaegerTrace(config.serviceName, config.enableDistributedTracing);
const net = require('net');
const tls = require('tls');
const assert = require('assert');
const shortid = require('shortid');
const mqtt = require('mqtt-packet');
const validate = require('./validate');

const opts = {protocolVersion: config.protocolVersion};

logger.log('debug', 'protocolVersion is '+ opts.protocolVersion);

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

async function wrappedValidate(clientAddress, packet, credentials, ctx) {
    assert(ctx);
    try {
        logger.log('debug', "Validating", {packet: packet.cmd});
        return await validate.validate(clientAddress, packet, credentials, ctx);
    } catch (err) {
        logger.log('error', "Error when validating", {errorName: err.name, errorMessage: err.message});
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

    logger.log('debug', "Opening connection", {
        clientOptionsHost: clientOptions.host,
        clientOptionsPort: clientOptions.port
    });
    const dstClient = socketConnect(clientOptions);

    dstClient.on('close', (hadError) => {
        logger.log('debug', "dstClient closed", {hadError: hadError});
    });

    srcClient.on('close', (hadError) => {
        logger.log('debug', "srcClient closed", {hadError: hadError});
    });

    dstClient.on('end', () => {
        logger.log('debug', "dstClient ended");
    });

    srcClient.on('end', () => {
        logger.log('debug', "srcClient ended");
    });

    dstClient.on('ready', () => {
        logger.log('debug', "dstClient ready");
    });

    srcClient.on('ready', () => {
        logger.log('debug', "srcClient ready");
    });

    dstClient.on('error', (err) => {
        logger.log('error', "err in dstClient", {errorName: err.name, errorMessage: err.message});
        srcClient && srcClient.destroy(err);
        dstClient.destroy(err);
    });

    srcClient.on('error', (err) => {
        logger.log('error', "err in srcClient", {errorName: err.name, errorMessage: err.message});
        dstClient && dstClient.destroy(err);
        srcClient.destroy(err);
    });

    dstClient.on("connect", () => {
        const srcParser = mqtt.parser(opts);
        const dstParser = mqtt.parser(opts);
        // const noopParser = mqtt.parser(opts);
        //
        // noopParser.on('packet', (packet) => {
        //     logger.log('debug', "packet event emitted on noopParser", {packet: packet});
        // });
        //
        // noopParser.on('error', (error) => {
        //     logger.log('debug', "error event emitted on noopParser", {errorMessage: error.message});
        // });

        srcClient.on('data', (data) => {
            logger.log('debug', "srcClient has data", {data: data});
            try {
                srcParser.parse(data);
            } catch (err) {
                logger.log('error', "Parse error in srcParser", {errorName: err.name, errorMessage: err.message});
            }
        });

        dstClient.on('data', (data) => {
            logger.log('debug', "dstClient has data", {data: data});
            try {
                dstParser.parse(data)
            } catch (err) {
                logger.log('error', "Parse error in dstParser", {errorName: err.name, errorMessage: err.message});
            }
        });

        const clientAddress = `${srcClient.remoteAddress}:${srcClient.remotePort}`;
        srcClient.credentials = {};
        srcClient.packetSet = new Set([]);

        if (config.no_auth) {
            srcParser.on('packet', (packet) => {
                logger.log('debug', "packet event emitted on srcParser", {packet: packet});
            });
            logger.log('debug', "Read from srcClient and pipe to dstClient without authorizing", {});
            srcClient.pipe(dstClient);

            dstParser.on('packet', (packet) => {
                logger.log('debug', "packet event emitted on dstParser", {packet: packet});
            });
            logger.log('debug', "Read from dstClient and pipe to srcClient without authorizing responses", {});
            dstClient.pipe(srcClient);
        } else {
            srcParser.on('packet', (packet) => {
                logger.log('debug', "packet event emitted on srcParser", {packet: packet});
                let rootSpan = tracer.startSpan('srcClient-packet');
                rootSpan.setTag("packet.cmd", packet.cmd);
                rootSpan.setTag("packet.clientId", packet.clientId || 'no_client_id');
                rootSpan.setTag("packet.topic", packet.topic);

                let packetID = shortid.generate();

                for (let key in packet) {
                    if (packet.hasOwnProperty(key)) {
                        if (key === 'cmd' || key === 'clientId' || key === 'topic') {
                            packetID = packetID + "_" + (packet[key] || 'no_client_id');
                        }
                    }
                }

                if (packet.cmd !== 'disconnect') {
                    srcClient.packetSet.add(packetID);
                    logger.log('debug', "srcClient.packetSet", {packetSet: srcClient.packetSet});
                }
                // get the client key and store it
                if (packet.cmd === 'connect') {
                    srcClient.credentials = {
                        username: packet.username,
                        password: packet.password && "" + packet.password
                    };

                    delete packet.username;
                    delete packet.password;
                    broker.username && (packet.username = broker.username);
                    broker.password && (packet.password = broker.password);
                }

                const ctx = rootSpan.context();
                wrappedValidate(clientAddress, packet, srcClient.credentials, ctx).then(result => {
                    let valid = result;
                    logger.log('debug', "packet validated", {packet: packet, result: valid});

                    if (valid.status) {

                        if (packet.cmd === 'disconnect') {
                            waitUntilEmpty(srcClient.packetSet, function () {
                                let generatedPacket = mqtt.generate(valid.packet, opts);
                                logger.log('debug', "Writing packet to dstClient", {
                                    packet: packet,
                                    validPacket: valid.packet
                                });
                                dstClient.write(generatedPacket);
                            }, 0);
                        } else {
                            let generatedPacket = mqtt.generate(valid.packet, opts);
                            logger.log('debug', "Writing packet to dstClient", {
                                packet: packet,
                                validPacket: valid.packet
                            });
                            dstClient.write(generatedPacket);
                        }
                    } else {
                        // configurable disconnect in case of an unauthorized request
                        // always disconnect clients in case of a unauthorized connect request after forwarding the connack
                        if (
                            (packet.cmd === 'subscribe' && config.disconnect_on_unauthorized_subscribe) ||
                            (packet.cmd === 'publish' && config.disconnect_on_unauthorized_publish) ||
                            (packet.cmd === 'connect')
                        ) {
                            if (valid.packet && valid.packet.cmd === "connack") {
                                let generatedPacket = mqtt.generate(valid.packet, opts);
                                logger.log('debug', "Writing packet to srcClient", {
                                    packet: packet,
                                    validPacket: valid.packet
                                });
                                valid.packet && srcClient.write(generatedPacket);
                            }

                            logger
                                .log('info', "Destroying clients because of unauthorized request", {packet: packet});
                            srcClient.destroy();
                            dstClient.destroy();
                        }
                        // if a disconnection is not configured, just forward the response to srcClient
                        else {
                            let generatedPacket = mqtt.generate(valid.packet, opts);
                            logger.log('debug', "Writing packet to srcClient", {
                                packet: packet,
                                validPacket: valid.packet
                            });
                            valid.packet && srcClient.write(generatedPacket);
                        }
                    }
                    if (packet.cmd !== 'disconnect') {
                        srcClient.packetSet.delete(packetID);

                    }
                }).catch(err => {
                    logger.log('error', "Error when validating", {errorName: err.name, errorMessage: err.message});
                    if (packet.cmd !== 'disconnect') {
                        srcClient.packetSet.delete(packetID);
                    }
                });
                rootSpan.finish();
            });

            if (config.authorize_response) {
                dstParser.on('packet', (packet) => {
                    logger.log('debug', "packet event emitted on dstParser", {packet: packet});
                    let rootSpan = tracer.startSpan('dstClient-packet');
                    rootSpan.setTag("packet.cmd", packet.cmd);
                    rootSpan.setTag("packet.clientId", packet.clientId || 'no_client_id');
                    rootSpan.setTag("packet.topic", packet.topic);

                    // response authorization
                    if (packet.cmd === 'publish') {

                        let subPacket = {
                            cmd: 'subscribe',
                            subscriptions: [{
                                topic: packet.topic
                            }]
                        };
                        const ctx = rootSpan.context();
                        wrappedValidate(clientAddress, subPacket, srcClient.credentials, ctx).then(result => {
                            let valid = result;
                            logger.log('debug', "Dummy response authorization packet validated", {
                                packet: subPacket,
                                result: valid
                            });

                            if (valid.status) {
                                logger.log('debug', "Writing packet to srcClient", {packet: packet});
                                srcClient.write(mqtt.generate(packet, opts));
                            } else {
                                logger.log('debug', "Disconnecting clients because of unauthorized response", {packet: packet});
                                srcClient.destroy();
                                dstClient.destroy();
                            }
                        }).catch(err => {
                            logger.log('error', "Error when validating", {
                                errorName: err.name,
                                errorMessage: err.message
                            });
                        });
                    } else {
                        logger.log('debug', "Writing packet to srcClient", {packet: packet});
                        srcClient.write(mqtt.generate(packet, opts));
                    }
                    rootSpan.finish();
                });
            } else {
                dstParser.on('packet', (packet) => {
                    logger.log('debug', "packet event emitted on dstParser", {packet: packet});
                });
                logger.log('debug', "Read from dstClient and pipe to srcClient without authorizing responses", {});
                dstClient.pipe(srcClient);
            }
        }
    });
});

server.on('error', (error) => {
    logger.log("error", "" + config.serviceName + " server event error", {
        errorName: error.name,
        errorMessage: error.message
    });
});

config.bind_addresses.forEach((addr) => {
    server.listen(config.bind_port, addr, () =>
        logger.log('info', `${config.serviceName} listening on ${addr}:${config.bind_port}`));
});
