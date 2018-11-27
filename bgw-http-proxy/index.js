// for cluster mode
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;

// end of cluster mode
const cors = require('cors');
const app = require('express')();
const https = require('https');
const http = require('http');
const tranform = require('transformer-proxy');
const agentHTTP = new http.Agent({keepAlive: true});
const agentHTTPS = new https.Agent({keepAlive: true});
const proxy = require('http-proxy/lib/http-proxy').createProxyServer({});
const config = require('./config');
const {transformURI, bgwIfy, REQ_TYPES} = require('./utils');
const {AAA, CAT, debug, isDebugOn} = require('../bgw-aaa-client');
const url = require('url');
const axios = require("axios");

const httpAuth = async (req) => {

    if (config.no_auth || req.bgw.alias.no_auth) {

        return {
            output: true
        }
    }

    const parse_fa = url.parse(req.bgw.forward_address);
    let host = parse_fa.hostname;
    let port = parse_fa.port || (parse_fa.protocol === 'https:' ? 443 : 80);
    const path = `${parse_fa.pathname}${url.parse(req.url).pathname}`.replace('//', '/');
    const payload = `HTTP/${req.method}/${host}/${port}${path}`;

    let response;
    try {
        response = await axios({
            method: 'post',
            headers: {authorization: req.headers.authorization || ""},
            url: config.auth_service,
            data: {
                input: payload,
                openid_connect_provider_name: config.openid_connect_provider_name || req.bgw.alias.openid_connect_provider_name || 'default'
            }
        });
    }
    catch (error) {
        AAA.log(CAT.DEBUG, 'auth-service returned an error message:', error.name, error.message);
        return {
            output: false,
            error: "Error in auth-service, " + error.name + ": " + error.message
        };
    }

    req.headers.authorization = (req.bgw.alias && req.bgw.alias.keep_authorization_header && req.headers.authorization) || (req.bgw.alias && req.bgw.alias.override_authorization_header)
        || config.override_authorization_header || "";

    return response.data;

};

if (config.multiple_cores && cluster.isMaster) {
    AAA.log(CAT.PROCESS_START, `Master PID ${process.pid} is running: CPU has ${numCPUs} cores`);
    for (let i = 0; i < numCPUs; i++)
        cluster.fork();
    cluster.on('exit', (worker, code, signal) => AAA.log(CAT.PROCESS_END, `worker ${worker.process.pid} died`));

} else {

    app.use(cors());

    app.use(async (req, res) => {

        bgwIfy(req);
        if (req.bgw.type === REQ_TYPES.UNKNOWN_REQUEST) {
            res.status(404).json({error: 'Unknown location'});
            return;
        }
        if (req.bgw.type === REQ_TYPES.INVALID_EXTERNAL_DOMAIN) {
            //config.redirect_on_invalid_external_domain ? res.redirect('https://' + config.external_domain + req.originalUrl) :
            res.status(404).json({error: 'Invalid external domain'});
            return;
        }
        if (req.bgw.type === REQ_TYPES.PROMPT_BASIC_AUTH) {
            res.set('WWW-Authenticate', 'Basic realm="User Visible Realm"');
            res.status(401).json({error: 'Unauthorized'});
            return;
        }

        const response = await httpAuth(req);
        if (response.output) {

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
                tranform(transformURI)(req, res, () => proxyied_request()) : proxyied_request();

        } else {
            if (req.bgw.alias && req.bgw.alias.use_basic_auth) {
                res.set('WWW-Authenticate', 'Basic realm="User Visible Realm"');
            }
            if (response.error) {
                if (response.error === 'Forbidden') {
                    res.status(403).json({error: response.error});
                }
                else {
                    res.status(401).json({error: response.error});
                }
            }
            else {
                res.status(401).json({error: 'Unauthorized'});
            }
        }


    });
    proxy.on('error', function (err, req, res) {
        isDebugOn && err && debug(err.stack || err);
        if (req.bgw && req.bgw.forward_address) {
            config.redirect_to_original_address_on_proxy_error ? res.redirect(req.bgw.forward_address + req.originalUrl) :
                res && res.status(500).json({error: `Border Gateway could not forward your request to ${req.bgw.forward_address}`});
        } else {
            res && res.status(500).json({error: `There is a problem with the internal forward address, make sure the internal address exists and is working: `});
        }

    });
    config.bind_addresses.forEach((addr) => {
        app.listen(config.bind_port, addr, () =>
            AAA.log(CAT.PROCESS_START, `PID ${process.pid} listening on ${addr}:${config.bind_port}`));
    });
}
