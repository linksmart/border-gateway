// for cluster mode
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;
// end of cluster mode
const fs = require('fs');
const net = require('net');
const tls = require('tls');
const shortid = require('shortid');
const mqtt = require('mqtt-packet');
const config = require('./config');
const {mqttAuth, AAA, CAT, isDebugOn, debug} = require('../bgw-aaa-client');
const validate = require('./validate');

let packetSet = new Set([]);

function waitUntilEmpty(packetSet, callback, counter) {
    setTimeout(
        function () {
            if (packetSet.size === 0) {
                AAA.log(CAT.DEBUG, "disconnect can be forwarded");
                if (callback != null) {
                    callback();
                }
                return;

            } else {
                counter++;
                if ((counter % 1000) === 0) {
                    AAA.log(CAT.DEBUG, "waiting for %d seconds before disconnect can be forwarded: ",counter/1000);
                }
                waitUntilEmpty(packetSet, callback,counter);
            }

        }, 5); // wait 5 miliseconds
}

async function wrappedValidate(clientAddress, packet, credentials) {
    try {
        let valid = await validate(clientAddress, packet, credentials);
        return valid;
    } catch (err) {
        AAA.log(CAT.ERROR, "err when validating", err);
        throw err;
    }
}

if (!config.single_core && cluster.isMaster) {
    AAA.log(CAT.PROCESS_START, `Master PID ${process.pid} is running: CPU has ${numCPUs} cores`);
    for (let i = 0; i < numCPUs; i++)
        cluster.fork();
    cluster.on('exit', (worker, code, signal) => AAA.log(CAT.PROCESS_END, `worker ${worker.process.pid} died`));

} else {
    const serverOptions = {};
    const broker = config.broker;
    const clientOptions = {
        host: broker.address,
        port: broker.port,
        ca: broker.tls && broker.tls_ca && [fs.readFileSync(broker.tls_ca)],
        key: broker.tls && broker.tls_client_key && fs.readFileSync(broker.tls_client_key),
        cert: broker.tls && broker.tls_client_cert && fs.readFileSync(broker.tls_client_cert)
    };

    AAA.log(CAT.PROCESS_START, "Creating mqtt-proxy server...");
    const server = net.createServer(serverOptions, (srcClient) => {

            const socketConnect = broker.tls ? tls.connect : net.connect;
            const dstClient = socketConnect(clientOptions, () => {
                const srcParser = mqtt.parser();
                const dstParser = mqtt.parser();

                srcClient.on('data', (data) =>
                    srcParser.parse(data));
                config.authorize_response ? dstClient.on('data', (data) => dstParser.parse(data)) : dstClient.pipe(srcClient);

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
                    AAA.log(CAT.DEBUG, "packet event emitted", packet.cmd);
                    let packetID = shortid.generate();
                    if (packet.cmd !== 'disconnect') {
                        packetSet.add(packetID);
                        AAA.log(CAT.DEBUG, "packetSet", packetSet);
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
                        AAA.log(CAT.DEBUG, 'packet validated', packet.cmd);

                        valid.packet = valid.packet && mqtt.generate(valid.packet);

                        if (valid.status) {

                            if (packet.cmd === 'disconnect') {
                                waitUntilEmpty(packetSet, function () {
                                    dstClient.write(valid.packet);
                                },0);
                            }
                            else {
                                dstClient.write(valid.packet);
                            }
                        }
                        else {
                            // if the packet is invalid in the case of publish or sub and
                            // configs for diconnectin on unauthorized is set to tru, then
                            // disocnnect
                            if ((packet.cmd === 'subscribe' && config.disconnect_on_unauthorized_subscribe) ||
                                (packet.cmd === 'publish' && config.disconnect_on_unauthorized_publish)) {
                                AAA.log(CAT.CON_TERMINATE, 'disconnecting client for unauthorized ', packet.cmd);
                                srcClient.destroy();
                                dstClient.destroy();
                            } else {
                                valid.packet && srcClient.write(valid.packet);
                            }
                        }
                        if (packet.cmd != 'disconnect') {
                            packetSet.delete(packetID);
                        }
                    }).catch(err => {
                        AAA.log(CAT.ERROR, "error when validating", err);
                        if (packet.cmd != 'disconnect') {
                            packetSet.delete(packetID);
                        }
                    });
                });
                dstParser.on('packet', (packet) => {
                    debug('index, js, message from broker (packet.cmd) =', packet.cmd);
                    // only when autherize responce config is set true, i validate each
                    // responce to subscriptions
                    if (packet.cmd === 'publish' && !(mqttAuth(clientAddress, credentials, 'SUB', packet.topic))) {
                        if (config.disconnect_on_unauthorized_response) {
                            AAA.log(CAT.CON_TERMINATE, 'disconnecting client for unauthorize subscription due to change user auth profile');
                            srcClient.destroy();
                            dstClient.destroy();
                        }
                    } else {
                        srcClient.write(mqtt.generate(packet));
                    }
                });
            });
        }
        )
    ;

    config.bind_addresses.forEach((addr) => {
        server.listen(config.bind_port, addr, () =>
            AAA.log(CAT.PROCESS_START, `PID ${process.pid} listening on ${addr}:${config.bind_port}`));
    });
}