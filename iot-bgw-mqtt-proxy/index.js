// for cluster mode
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;
// end of cluster mode
const fs = require('fs');
const net = require('net');
const tls = require('tls');
const mqtt = require('mqtt-packet');
const config = require('./config');
const {mqttAuth, AAA, CAT, isDebugOn, debug} = require('../iot-bgw-aaa-client');
const validate = require('./validate');

if (!config.single_core && cluster.isMaster) {
    AAA.log(CAT.PROCESS_START, `Master PID ${process.pid} is running: CPU has ${numCPUs} cores`);
    for (let i = 0; i < numCPUs; i++)
        cluster.fork();
    cluster.on('exit', (worker, code, signal) => AAA.log(CAT.PROCESS_END, `worker ${worker.process.pid} died`));

} else {
    debug('index.js, config.disable_bind_tls =', config.disable_bind_tls);
    const createServer = config.disable_bind_tls ? net.createServer : tls.createServer;
    const serverOptions = config.disable_bind_tls ? {} : {
        key: fs.readFileSync(config.tls_key),
        cert: fs.readFileSync(config.tls_cert)
    };
    const broker = config.broker;
    // debug('index.js, broker =',broker)
    const clientOptions = {
        host: broker.address,
        port: broker.port,
        ca: broker.tls && broker.tls_ca && [fs.readFileSync(broker.tls_ca)],
        key: broker.tls && broker.tls_client_key && fs.readFileSync(broker.tls_client_key),
        cert: broker.tls && broker.tls_client_cert && fs.readFileSync(broker.tls_client_cert)
    };

    AAA.log(CAT.PROCESS_START, "Creating mqtt-proxy server...");
    const server = createServer(serverOptions, (srcClient) => {

        // debug('index.js, srcClient =',srcClient)
        // debug('index.js, serverOptions =',serverOptions)

        const socketConnect = broker.tls ? tls.connect : net.connect;
        const dstClient = socketConnect(clientOptions, () => {
            const srcParser = mqtt.parser();
            const dstParser = mqtt.parser();

            srcClient.on('data', (data) => srcParser.parse(data));
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
            //debug('index.js, clientAddress =', clientAddress);
            let credentials = {};

            // debug('index.js, packet =',packet)
            srcParser.on('packet', async (packet) => {
                // debug('index.js, message from client (packet.cmd) = ', packet.cmd);

                // get the client key and store it
                if (packet.cmd === 'connect') {
                    credentials = {username: packet.username, password: packet.password && "" + packet.password};

                    delete packet.username;
                    delete packet.password;
                    broker.username && (packet.username = broker.username);
                    broker.password && (packet.password = broker.password);
                }
                // validate the packet
                let valid = await validate(clientAddress, packet, credentials);

                valid.packet = valid.packet && mqtt.generate(valid.packet);

                if (valid.status) {
                    dstClient.write(valid.packet); // replaced mqtt.generate with
                    // mqtt.writeToStream
                } else {
                    // if the packet is invlaid in the case of publish or sub and
                    // configs for diconnectin on unauthorized is set to tru, then
                    // disocnnect
                    if ((packet.cmd === 'subscribe' && config.disconnect_on_unauthorized_subscribe) ||
                            (packet.cmd === 'publish' && config.disconnect_on_unauthorized_publish)) {
                        AAA.log(CAT.CON_TERMINATE, 'disconnecting client for unauthorized ', packet.cmd);
                        srcClient.destroy();
                        dstClient.destroy();
                    } else {
                        valid.packet && srcClient.write(valid.packet);  // replaced
                        // mqtt.generate
                        // with
                        // mqtt.writeToStream
                    }
                }


            });
            dstParser.on('index.js, packet', async (packet) => {
                debug('index, js, message from broker (packet.cmd) =', packet.cmd);
                // only when autherize responce config is set true, i validate each
                // responce to subscriptions
                if (packet.cmd === 'publish' && !(await mqttAuth(clientAddress, credentials, 'SUB', packet.topic))) {
                    if (config.disconnect_on_unauthorized_response) {
                        AAA.log(CAT.CON_TERMINATE, 'disconnecting client for unauthorize subscription due to change user auth profile');
                        srcClient.destroy();
                        dstClient.destroy();
                    }
                } else {
                    srcClient.write(mqtt.generate(packet)); // replaced mqtt.generate
                    // with
                    // mqtt.writeToStream
                }
            });
        });
    });


    server.listen(config.bind_port, config.bind_address, () =>
        AAA.log(CAT.PROCESS_START, `PID ${process.pid} listening on ${config.bind_address}:${config.bind_port}`));
    //debug('validate.js, server =', server);
    //debug('validate.js, NODE_DEBUG =', process.env.NODE_DEBUG);
    // debug('validate.js, HOSTNAME =',process.env.HOSTNAME)
    // debug('validate.js, EXTERNAL_DOMAIN =',process.env.EXTERNAL_DOMAIN)

}