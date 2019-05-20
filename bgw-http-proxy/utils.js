const config = require('./config');
const logger = require('../logger/log')(config.serviceName, config.logLevel);
const {transformURI, decode} = require("./translate_res");
const axios = require("axios");
const url = require("url");

const TYPES = {
    FORWARD: 'FORWARD',
    FORWARD_W_T: 'FORWARD_W_T',
    UNKNOWN_REQUEST: 'UNKNOWN_REQUEST',
    INVALID_EXTERNAL_DOMAIN: "INVALID_EXTERNAL_DOMAIN"
};

const httpAuth = async (req) => {

    if (config.no_auth || (req.bgw.alias && req.bgw.alias.no_auth)) {

        return {
            isAuthorized: true
        }
    }

    logger.log('debug', 'Host headers in request', {
        host: req.headers.host,
        x_fowarded_host: req.headers['x-forwarded-host']
    });

    let httpHost = req.headers['x-forwarded-host'] || req.headers.host;
    let splitHost;
    if (httpHost) {
        splitHost = httpHost.split(":");
    } else {

        let ip = req.headers['x-forwarded-for'] ||
            (req.connection && req.connection.remoteAddress) ||
            (req.socket && req.socket.remoteAddress) ||
            (req.connection && req.connection.socket && req.connection.socket.remoteAddress);
        logger.log('debug', 'Strange http request with empty or missing host header', {
            ip: ip,
            originalUrl: req.originalUrl,
            httpVersion: req.httpVersion,
            method: req.method,
            headers: req.headers
        });
        return {
            isAuthorized: false
        }
    }

    let host = splitHost[0];
    let port = splitHost[1] || 80;
    let protocol = 'HTTP';
    if (req.headers['x-forwarded-proto']) {
        protocol = req.headers['x-forwarded-proto'].toUpperCase();
    }

    if (req.headers['x-forwarded-port']) {
        port = req.headers['x-forwarded-port'];
    }

    // get rid of query parameters for authorization check
    const path = req.originalUrl.split("?")[0].replace('//', '/');
    const payload = `${protocol}/${req.method}/${host}/${port}${path}`;
    let authorization = "";
    let code;
    // Keycloak sets "Basic Og==" (decoded: ":")
    if (req.headers.authorization && req.headers.authorization != "Basic Og==") {
        authorization = req.headers.authorization;
    } else {
        let query = url.parse(req.originalUrl, true).query;

        if (query && query.username) {
            if (query.password) {
                authorization = 'Basic ' + Buffer.from(query.username + ':' + query.password).toString('base64');
            } else {
                authorization = 'Bearer ' + query.username;
            }
        }

        if (query && query.code) {
            code = query.code;


        }
    }


    let response;
    try {
        response = await axios({
            method: 'post',
            headers: {authorization: authorization},
            url: config.auth_service + "/authorize",
            data: {
                rule: payload,
                code: code,
                openidConnectProviderName: (req.bgw.alias && req.bgw.alias.openidConnectProviderName) || config.openidConnectProviderName || 'default'
            }
        });
    } catch (error) {
        logger.log('error', 'Error in auth-service', {errorName: error.name, errorMessage: error.message});
        return {
            isAuthorized: false,
            error: "Error in auth-service, " + error.name + ": " + error.message
        };
    }

    req.headers.authorization = (req.bgw.alias && req.bgw.alias.keep_authorization_header && req.headers.authorization) || "";

    return response.data;

};

const bgwIfy = async (req) => {
        req.bgw = {};

        //const public_domain = config.sub_domain_mode ?  host.includes(config.external_domain) : host === config.external_domain;

        logger.log('debug', 'Host headers in request', {
            host: req.headers.host,
            x_fowarded_host: req.headers['x-forwarded-host']
        });

        let httpHost = req.headers['x-forwarded-host'] || req.headers.host;
        let splitHost;
        if (httpHost) {
            splitHost = httpHost.split(":");
        } else {
            let ip = req.headers['x-forwarded-for'] ||
                (req.connection && req.connection.remoteAddress) ||
                (req.socket && req.socket.remoteAddress) ||
                (req.connection && req.connection.socket && req.connection.socket.remoteAddress);
            logger.log('debug', 'Strange http request with empty or missing host header', {
                ip: ip,
                originalUrl: req.originalUrl,
                httpVersion: req.httpVersion,
                method: req.method,
                headers: req.headers
            });
            req.bgw = {type: TYPES.INVALID_EXTERNAL_DOMAIN};
            return;
        }
        let host = splitHost[0];
        let locationsFromConfigService = {};
        let locations = {};

        if (config.domains[host]) {
            Object.assign(locations, config.domains[host]);

            if (config.configurationService) {
                let response;
                try {
                    response = await axios({
                        method: 'get',
                        params: {
                            domain: host
                        },
                        headers: {authorization: req.headers.authorization || ""},
                        url: config.configurationService + "/locations"
                    });
                } catch (error) {
                    logger.log('error', 'Error in configuration-service', {
                        errorName: error.name,
                        errorMessage: error.message
                    });
                }

                if (response && response.data) {
                    for (let key in response.data) {

                        if (response.data.hasOwnProperty(key)) {
                            //expected format: <host>/<location>
                            let location = (key.split("/"))[1];
                            locationsFromConfigService[location] = response.data[key];
                        }

                    }
                }
            }
        } else {
            req.bgw = {type: TYPES.INVALID_EXTERNAL_DOMAIN};
            return;

        }

        Object.assign(locations, locationsFromConfigService);

        // check if subdomain mode e.g. https://rc.gateway.com or https://gateway.com/rc
        //let local_dest =  config.sub_domain_mode ? host.split(config.external_domain).filter((e)=>e!=="")[0]:req.url.split(/\/|\?|\#/)[1];
        let urlArray = req.url.split(/\/|\?|\#/);
        let local_dest = urlArray[1];
        local_dest = local_dest && local_dest.replace(".", "");
        //req.url =  config.sub_domain_mode ? req.url : req.url.replace(`/${local_dest}`,"");
        req.url = req.url.replace(`/${local_dest}`, "");

        if (locations[local_dest]) {
            req.bgw = {
                forward_address: locations[local_dest].local_address,
                alias: locations[local_dest]
            };

            const translate = req.bgw.alias.translate_local_addresses;
            req.bgw.type = (translate) ? TYPES.FORWARD_W_T : TYPES.FORWARD;
            return
        }

        const decoded_local_dest = local_dest && decode(local_dest);
        if (local_dest && decoded_local_dest) {
            req.bgw = {type: TYPES.FORWARD, forward_address: decoded_local_dest};
            return
        }
        req.bgw = {type: TYPES.UNKNOWN_REQUEST}
    }
;

module.exports.httpAuth = httpAuth;
module.exports.bgwIfy = bgwIfy;
module.exports.REQ_TYPES = TYPES;
module.exports.transformURI = transformURI;
