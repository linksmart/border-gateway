const config = require('./config');
const logger = require('../logger/log')(config.serviceName,config.logLevel);
const cors = require('cors');
const app = require('express')();
const https = require('https');
const http = require('http');
const transform = require('transformer-proxy');
const agentHTTP = new http.Agent({});
const agentHTTPS = new https.Agent({});
const proxy = require('http-proxy/lib/http-proxy').createProxyServer({});
const {httpAuth, transformURI, bgwIfy, REQ_TYPES} = require('./utils');

app.use(cors());

app.use(async (req, res) => {

    await bgwIfy(req);
    if (req.bgw.type === REQ_TYPES.UNKNOWN_REQUEST) {
        res.status(404).json({error: 'Unknown location'});
        return;
    }
    if (req.bgw.type === REQ_TYPES.INVALID_EXTERNAL_DOMAIN) {
        res.status(404).json({error: 'Invalid external domain'});
        return;
    }

    const anonymousRequest = (!req.headers.authorization || req.headers.authorization === "");

    const response = await httpAuth(req);
    if (response.isAuthorized) {

        const is_https = req.bgw.forward_address.includes('https://');
        const {http_req, https_req} = (req.bgw.alias && req.bgw.alias.change_origin_on) || config.change_origin_on;
        const insecure = (req.bgw.alias && req.bgw.alias.insecure) || false;
        const proxyied_options = {
            target: req.bgw.forward_address || 'error',
            secure: !insecure,
            agent: is_https ? agentHTTPS : agentHTTP,
            changeOrigin: (http_req && https_req) ||
                (is_https && https_req) ||
                (!is_https && http_req)
        };
        const proxyied_request = () => proxy.web(req, res, proxyied_options);

        req.bgw.type === REQ_TYPES.FORWARD_W_T ?
            transform(transformURI)(req, res, () => proxyied_request()) : proxyied_request();

    } else {
        if (response.error === 'Forbidden' && !anonymousRequest) {
            res.status(403).json({error: response.error});
        }
        else {
            res.set('WWW-Authenticate', 'Basic realm="LinkSmart Border Gateway", charset="UTF-8"');
            res.status(401).json({error: response.error});
        }
    }
});
proxy.on('error', function (err, req, res) {
    logger.log('error', 'Error in proxy',{errorName: err.name, errorMessage: err.message, errorStack: err.stack});
    if (req.bgw && req.bgw.forward_address) {
        res && res.status(500).json({error: `Border Gateway could not forward your request to ${req.bgw.forward_address}`});
    } else {
        res && res.status(500).json({error: `There is a problem with the internal forward address, make sure the internal address exists and is working: `});
    }

});
config.bind_addresses.forEach((addr) => {
    app.listen(config.bind_port, addr, () =>
        logger.log('info', `${config.serviceName} listening on ${addr}:${config.bind_port}`));
});

