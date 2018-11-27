// for cluster mode
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;
// end of cluster mode
const fs = require('fs');
const tls = require('tls');
const net = require('net');
//const insubnet = require('insubnet');
const config = require('./config');
const {AAA, CAT, debug} = require('../bgw-aaa-client');

debug('external interface configs', JSON.stringify(config, null, 4));

if (config.multiple_cores && cluster.isMaster) {
    AAA.log(CAT.PROCESS_START, `Master PID ${process.pid} is running: CPU has ${numCPUs} cores`);
    for (let i = 0; i < numCPUs; i++)
        cluster.fork();
    cluster.on('exit', (worker, code, signal) => AAA.log(CAT.PROCESS_END, `worker ${worker.process.pid} died`));

} else {

    const options = {
        key: fs.readFileSync(config.tls_key),
        cert: fs.readFileSync(config.tls_cert),
        requestCert: config.request_client_cert,
        rejectUnauthorized: config.request_client_cert,
        ca: config.request_client_cert && config.client_ca_path && fs.readFileSync(config.client_ca_path),
        ALPNProtocols: config.enable_ALPN_mode && ['bgw_info'].concat(config.servers.map(e => e.name))
    };

    config.servers.forEach((srv) => {
        AAA.log(CAT.PROCESS_START, `Creating server ${srv.name} for external interface...`);
        const external_interface = tls.createServer(options, function (srcClient) {

            let dstClient = false;

            srcClient.on('error', () => {
                srcClient.destroy();
                dstClient && dstClient.destroy();
            });

            const ALPN_srv = config.enable_ALPN_mode && srcClient.alpnProtocol && config.servers.find((e) => e.name === srcClient.alpnProtocol);
            const {dest_address, dest_port, name} = ALPN_srv || srv;

            if (config.enable_ALPN_mode && srcClient.alpnProtocol === 'bgw_info') {
                srcClient.end(config.servers.reduce((a, c) => a + ',' + c.name, ''));
            } else if (srcClient.remoteAddress && srcClient.remotePort) {
                dstClient = net.connect({host: dest_address, port: dest_port}, () => {
                    AAA.log(CAT.CON_START, `${srcClient.remoteAddress}:${srcClient.remotePort} > ${srcClient.localPort} > [PORT:${dstClient.localPort}] > ${name}`);
                    dstClient.on('error', () => {
                        dstClient.destroy();
                        srcClient && srcClient.destroy();
                    });
                    srcClient.pipe(dstClient).pipe(srcClient);
                });
            } else {
                //might wanna destroy client
                //client.destroy()
            }
            srcClient.on('end', () => {
                srcClient.remoteAddress && srcClient.remotePort &&
                AAA.log(CAT.CON_END, `${srcClient.remoteAddress}:${srcClient.remotePort} > ${srv.bind_port}  > ${name}`);
            });
        });
        external_interface.on('tlsClientError', (e) => debug('tls error,this could be a none tls connection, make sure to establish a proper tls connection, details...', e.stack || e));
//        external_interface.on('secureConnection', function (socket) {
//            debug('secureConnection, details...', socket)
//        });

        srv.bind_addresses.forEach((addr) => {
            external_interface.listen(srv.bind_port, addr, () =>
                AAA.log(CAT.PROCESS_START, `PID ${process.pid} Forwarding ${srv.name} ${addr}:${srv.bind_port} ===> ${srv.dest_address}:${srv.dest_port}`));
        });


    });

}
