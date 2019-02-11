const config = require('./config');
const {transformURI, decode} = require("./translate_res");
const axios = require("axios");
const {AAA, CAT, debug, isDebugOn} = require('../bgw-aaa-client');
const redis = require("redis");
const url = require("url");
const asyncRedis = require("async-redis");
const isVarName = require("is-var-name");
let redisClient;

if (config.redis_host) {
    redisClient = redis.createClient({port: config.redis_port, host: config.redis_host});
    asyncRedis.decorate(redisClient);
}

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

    AAA.log(CAT.DEBUG, 'http-proxy', 'req.headers.host:', req.headers.host, ' req.headers[x-forwarded-host]:', req.headers['x-forwarded-host']);
    let httpHost = req.headers['x-forwarded-host'] || req.headers.host;
    const splitHost = httpHost.split(":");
    let host = splitHost[0];
    let port = splitHost[1] || 80;
    let protocol = 'HTTP';
    if (req.headers['x-forwarded-proto']) {
        protocol = req.headers['x-forwarded-proto'].toUpperCase();
    }

    const path = req.originalUrl.replace('//', '/');
    const payload = `${protocol}/${req.method}/${host}/${port}${path}`;

    let response;
    try {
        response = await axios({
            method: 'post',
            headers: {authorization: req.headers.authorization || ""},
            url: config.auth_service + "/bgw/authorize",
            data: {
                rule: payload,
                openidConnectProviderName: (req.bgw.alias && req.bgw.alias.openidConnectProviderName) || config.openidConnectProviderName || 'default'
            }
        });
    }
    catch (error) {
        AAA.log(CAT.DEBUG, 'http-proxy', 'auth-service returned an error message:', error.name, error.message);
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

        AAA.log(CAT.DEBUG, 'http-proxy', 'req.headers.host:', req.headers.host, ' req.headers[x-forwarded-host]:', req.headers['x-forwarded-host']);
        let httpHost = req.headers['x-forwarded-host'] || req.headers.host;
        const splitHost = httpHost.split(":");
        let host = splitHost[0];
        let locationsFromRedis = [];
        let destinationsFromRedis = [];
        let locations = {};

        if (config.domains[host]) {
            Object.assign(locations, config.domains[host]);

            let response;
            try {
                response = await axios({
                    method: 'get',
                    params: {
                        host: host
                    },
                    headers: {authorization: req.headers.authorization || ""},
                    url: config.configuration_service + "/locations"
                });
            }
            catch (error) {
                AAA.log(CAT.DEBUG, 'http-proxy', 'configuration-service returned an error message:', error.name, error.message);
            }

            if (response && response.data) {
                i = 0;
                for (let key in response.data) {

                    if (response.data.hasOwnProperty(key)) {
                        //expected format: <host>/<location>
                        let location = (key.split("/"))[1];

                        if (location && isVarName(location)) {

                            if (response.data[key].local_address) {

                                let urlParseResult = url.parse(response.data[key].local_address);
                                urlParseResult.port = urlParseResult.port ? urlParseResult.port : (urlParseResult.protocol === "https:" ? 443 : 80);

                                if (!(urlParseResult.protocol && urlParseResult.host && urlParseResult.port)) {
                                    AAA.log(CAT.DEBUG, 'http-proxy', "Value retrieved from configuration-service does not contain a valid destination:", parsed);
                                    continue;
                                }
                                locationsFromRedis[i] = location;
                                destinationsFromRedis[i] = response.data[key];
                                AAA.log(CAT.DEBUG, 'http-proxy', "locationsFromRedis[" + i + "]", locationsFromRedis[i]);
                                AAA.log(CAT.DEBUG, 'http-proxy', "destinationsFromRedis[" + i + "]", destinationsFromRedis[i])
                                i++;
                            }


                        } else {
                            AAA.log(CAT.DEBUG, 'http-proxy', "Key retrieved from configuration-service does not contain a valid location:", location);
                            continue
                        }
                    }

                }
            }
        }
        else {
            req.bgw = {type: TYPES.INVALID_EXTERNAL_DOMAIN};
            return;

        }

        for (let i = 0; i < locationsFromRedis.length; i++) {
            if (locationsFromRedis[i] && destinationsFromRedis[i]) {
                locations[locationsFromRedis[i]] = destinationsFromRedis[i];
                AAA.log(CAT.DEBUG, 'http-proxy', "Added location", locationsFromRedis[i], "with destination", destinationsFromRedis[i], "to locations");
            }
        }

        for (let key in locations) {
            if (locations.hasOwnProperty(key)) {
                console.log("location:" + key + " -> " + JSON.stringify(locations[key]));
            }
        }

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
