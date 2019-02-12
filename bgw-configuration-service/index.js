const config = require('./config');
const url = require("url");
const {AAA, CAT} = require('../bgw-aaa-client');
const restify = require('restify');
const isVarName = require("is-var-name");
const redis = require("redis");
const asyncRedis = require("async-redis");
let redisClient;

const server = restify.createServer({
    name: 'bgw-configuration-service',
    version: '1.0.0'
});

AAA.log(CAT.DEBUG, 'configuration-service', "redis_host", config.redis_host);

if (config.configurationService && config.redis_host) {
    redisClient = redis.createClient({port: config.redis_port, host: config.redis_host});
    asyncRedis.decorate(redisClient);


    for (let domain in config.domains) {
        if (config.domains.hasOwnProperty(domain)) {

            for (let location in config.domains[domain]) {
                if (config.domains[domain].hasOwnProperty(location)) {
                    redisClient.set("bgw-configuration-service-location:" + domain + "/" + location, JSON.stringify(config.domains[domain][location]));
                }
            }
        }
    }
}
server.use(restify.plugins.queryParser());
server.use(restify.plugins.bodyParser());

server.get('/locations:domain:location', async (req, res, next) => {

    AAA.log(CAT.DEBUG, 'configuration-service', "Request to redis endpoint locations");

    if (!(config.configurationService && config.redis_host)) {
        res.send(404,"Not Found");
        return next();
    }

    let result = {};

    let searchString = "bgw-configuration-service-location:*";

    if (req.query.domain) {

        searchString = "bgw-configuration-service-location:" + req.query.domain + "*";
    }
    if (req.query.location) {
        searchString = "bgw-configuration-service-location:" + req.query.domain + "/" + req.query.location + "*";
    }

    let keysFromRedis = await redisClient.keys(searchString);

    AAA.log(CAT.DEBUG, 'configuration-service', "keysFromRedis", keysFromRedis);

    for (let i = 0; i < keysFromRedis.length; i++) {
        let value = await redisClient.get(keysFromRedis[i]);
        AAA.log(CAT.DEBUG, 'configuration-service', "value", value);
        try {
            result[keysFromRedis[i].replace("bgw-configuration-service-location:", "")] = JSON.parse(value);
        }
        catch (err) {
            AAA.log(CAT.DEBUG, 'configuration-service', "invalid JSON", err);
            result[keysFromRedis[i]] = value;
        }
    }

    res.send(200, result);
    return next();
});

server.put('/locations:domain:location', async (req, res, next) => {

    AAA.log(CAT.DEBUG, 'configuration-service', "PUT request to redis endpoint locations with domain", req.query.domain, "and location", req.query.location);

    if (!(config.configurationService && config.redis_host)) {
        res.send(404, "Not Found");
        return next();
    }

    if (req.body && req.body.local_address && (req.query.domain && req.query.location)) {

        if (!config.domains[req.query.domain])
        {
            res.send(404, "Not Found. Given domain is not defined in config.json.");
            return next();
        }

        if (!isVarName(req.query.location))
        {
            res.send(400, "Bad Request. Given location name is not a valid variable name.");
            return next();
        }


        let urlParseResult = url.parse(req.body.local_address);
        urlParseResult.port = urlParseResult.port ? urlParseResult.port : (urlParseResult.protocol === "https:" ? 443 : 80);

        if (!(urlParseResult.protocol && urlParseResult.host && urlParseResult.port)) {
            res.send(400, "Bad Request. Given local_address "+req.body.local_address+" is not a valid url.");
            return next();
        }

        let result = await redisClient.set("bgw-configuration-service-location:" + req.query.domain + "/" + req.query.location, JSON.stringify(req.body));
        if (result === "OK") {
            res.send(200, "OK");
        }
        else {
            res.send(400, "Bad Request");
        }
    }
    else {
        res.send(400, "Bad Request");
    }
    return next();
});

server.del('/locations:domain:location', async (req, res, next) => {

    AAA.log(CAT.DEBUG, 'configuration-service', "DEL request to locations endpoint with domain", req.query.domain), "and location", req.query.location;

    if (!(config.configurationService && config.redis_host)) {
        res.send(404, "Not Found");
        return next();
    }

    if (req.query.domain && req.query.location) {
        let numOfRemovedKeys;

        numOfRemovedKeys = await redisClient.del("bgw-configuration-service-location:" + req.query.domain + "/" + req.query.location);

        if (numOfRemovedKeys === 0) {
            res.send(404, "Not Found");
        }
        else {
            res.send(200, "OK");
        }
    }
    else {
        res.send(400, "Bad Request");
    }
    return next();
});

server.listen(config.bind_port, () =>
    AAA.log(CAT.PROCESS_START, 'configuration-service', `configuration-service listening on port ${config.bind_port}`));


