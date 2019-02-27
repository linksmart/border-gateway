const config = require('./config');
const logger = require('../logger/log')(config.serviceName, config.logLevel);
const tls = require('tls');
const net = require('net');
const httpProxy = require('http-proxy');
const fs = require('fs');

// debug('external interface configs', JSON.stringify(config, null, 4));

const options = {
    key: fs.readFileSync(config.tls_key),
    cert: fs.readFileSync(config.tls_cert),
    requestCert: config.request_client_cert,
    rejectUnauthorized: config.request_client_cert,
    ca: config.request_client_cert && config.client_ca_path && fs.readFileSync(config.client_ca_path),
    ALPNProtocols: config.enable_ALPN_mode && ['bgw_info'].concat(config.servers.map(e => e.name))
};

config.servers.forEach((srv) => {
    logger.log('info', 'Creating server '+srv.name+' for external interface');

    let external_interface;

    if (srv.name === 'http-proxy') {
        external_interface = httpProxy.createProxyServer({
            target: {
                host: srv.dest_address,
                port: srv.dest_port
            },
            ssl: options
        });

        external_interface.on('proxyReq', function (proxyReq, req, res, options) {

            logger.log('debug', 'Host headers in request',{host: req.headers.host,x_fowarded_host:req.headers['x-forwarded-host']});
            proxyReq.setHeader('x-forwarded-proto', req['x-forwarded-proto'] || 'https');
            if(req.headers.host) {
                proxyReq.setHeader('x-forwarded-host', req['x-forwarded-host'] || (req.headers.host.split(":"))[0] + ":" + srv.bind_port);
                logger.log('debug', 'Host headers in request after setHeader',{host: req.headers.host,x_fowarded_host:req.headers['x-forwarded-host']});
            }
            else{
                logger.log('debug', 'Strange http request',{requestHeaders: req.headers});
            }
        });
    }
    else {
        external_interface = tls.createServer(options, function (srcClient) {

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
                    logger.log('debug', `Start connection ${srcClient.remoteAddress}:${srcClient.remotePort} > ${srcClient.localPort} > [PORT:${dstClient.localPort}] > ${name}`);
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
                logger.log('debug', `End connection ${srcClient.remoteAddress}:${srcClient.remotePort} > ${srv.bind_port}  > ${name}`);
            });
        });
        external_interface.on('tlsClientError', (e) => debug('tls error,this could be a none tls connection, make sure to establish a proper tls connection, details...', e.stack || e));

    }
    srv.bind_addresses.forEach((addr) => {
        external_interface.listen(srv.bind_port, addr, () =>
            logger.log('info', `PID ${process.pid} Forwarding ${srv.name} ${addr}:${srv.bind_port} ===> ${srv.dest_address}:${srv.dest_port}`));
    });

})
;

