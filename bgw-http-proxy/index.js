const config = require('./config');
const logger = require('../logger/log')(config.serviceName, config.logLevel);
const tracer = require('../tracer/trace')(config.serviceName,config.enableDistributedTracing);
const cors = require('cors');
const app = require('express')();
const https = require('https');
const http = require('http');
const url = require("url");
const transform = require('transformer-proxy');
const agentHTTP = new http.Agent({});
const agentHTTPS = new https.Agent({});
const proxy = require('http-proxy/lib/http-proxy').createProxyServer({});
const {httpAuth, transformURI, bgwIfy, REQ_TYPES} = require('./utils');
const zipkinMiddleware = require('zipkin-instrumentation-express').expressMiddleware;

// Add the Zipkin middleware
app.use(zipkinMiddleware({tracer}));

app.use(cors());

app.use('/status', async (req, res) => {

    logger.log('debug', 'endpoint status called');
    res.status(200).json({status:"ok"});
});

app.use('/callback', async (req, res) => {

    let query = url.parse(req.url, true).query;
    logger.log('debug', 'endpoint callback called', {queryState: query && query.state});
    if (query && query.state) {

        let targetUrl;
        try {
            targetUrl = new url.URL(query.state);
        }
        catch(err)
        {
            logger.log('error', 'No valid URL in query parameter state');
            res.status(404).json({error: 'Unknown location'});
            return;
        }
        delete query.state;
        for (let property in query) {
            targetUrl.searchParams.append(property, query[property]);
        }
        res.redirect(targetUrl.toString());
    }
    else
    {
        res.status(404).json({error: 'Unknown location'});
    }
});


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
        if (response.error === 'Forbidden' && !response.authUrl) {
            res.status(403).json({error: response.error});
        } else {
            //config.use_basic_auth: legacy, for Composition only
            const use_basic_auth = (req.bgw.alias && req.bgw.alias.use_basic_auth) || config.use_basic_auth;
            if (response.authUrl && !use_basic_auth) {
                const myURL =
                    new url.URL(response.authUrl);
                res.redirect(myURL);
            } else {
                res.set('WWW-Authenticate', 'Basic realm="LinkSmart Border Gateway", charset="UTF-8"');
                res.status(401).json({error: response.error});
            }
        }
    }
});
proxy.on('error', function (err, req, res) {
    logger.log('error', 'Error in proxy', {errorName: err.name, errorMessage: err.message, errorStack: err.stack});
    if (req.bgw && req.bgw.forward_address) {
        logger.log('error', `Border Gateway could not forward your request to ${req.bgw.forward_address}` + ' ' + err.message, {});
        res && res.status(500).json({error: `Border Gateway could not forward your request to ${req.bgw.forward_address}` + ' ' + err.message});
    } else {
        logger.log('error', `There is a problem with the internal forward address, make sure the internal address exists and is working`, {});
        res && res.status(500).json({error: `There is a problem with the internal forward address, make sure the internal address exists and is working`});
    }

});
config.bind_addresses.forEach((addr) => {
    app.listen(config.bind_port, addr, () =>
        logger.log('info', `${config.serviceName} listening on ${addr}:${config.bind_port}`));
});

