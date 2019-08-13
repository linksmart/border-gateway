const config = require('./config');
const logger = require('../logger/log')(config.serviceName, config.logLevel);
const tracer = require('../tracer/trace').jaegerTrace(config.serviceName,config.enableDistributedTracing);
const url = require("url");
const restify = require('restify');
const isVarName = require("is-var-name");
const redis = require("redis");
const asyncRedis = require("async-redis");
let redisClient;

const server = restify.createServer({
    name: 'bgw-configuration-service',
    version: '1.0.0'
});

if (config.configurationService) {

    redisClient = redis.createClient({
        port: config.redis_port, host: config.redis_host,
        retry_strategy: function (options) {
            if (options.total_retry_time > 1000 * 60) {
                // End reconnecting after a specific timeout and flush all commands
                // with a individual error
                logger.log('error', 'Retry time exhausted');
                return new Error('Retry time exhausted');
            }
            if (options.attempt > 1000) {
                // End reconnecting with built in error
                return undefined;
            }
            // reconnect after
            return Math.min(options.attempt * 100, 3000);
        }
    });

    asyncRedis.decorate(redisClient);

    redisClient.on('ready', function () {
        logger.log('debug', 'redisClient is ready');
    });

    redisClient.on('connect', function () {
        logger.log('debug', 'redisClient is connected');
    });

    redisClient.on('reconnecting', function () {
        logger.log('debug', 'redisClient is reconnecting');
    });

    redisClient.on('error', function (error) {
        logger.log('error', 'Error in redisClient', {error:error});
    });

    redisClient.on('end', function () {
        logger.log('debug', 'redisClient has ended the connection');
    });

    redisClient.on('warning', function (warning) {
        logger.log('info', 'Warning for redisClient',{warning:warning});
    });

    for (let domain in config.domains) {
        for (let location in config.domains[domain]) {
            redisClient.set("bgw-configuration-service-location:" + domain + "/" + location, JSON.stringify(config.domains[domain][location]));

        }
    }
}


server.use(restify.plugins.queryParser());
server.use(restify.plugins.bodyParser());

server.get('/locations:domain:location', async (req, res, next) => {

    logger.log('debug', 'GET request to endpoint locations');
    if (!(config.configurationService)) {
        res.send(404, "Not Found. Redis is not up and running.");
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

    let keysFromRedis;
    try {
        keysFromRedis = await redisClient.keys(searchString);
    } catch (err) {
        res.send(500, err);
        return next();
    }

    for (let i = 0; i < keysFromRedis.length; i++) {
        let value;
        try {
            value = await redisClient.get(keysFromRedis[i]);
        } catch (err) {
            res.send(500, err);
            return next();
        }

        try {
            result[keysFromRedis[i].replace("bgw-configuration-service-location:", "")] = JSON.parse(value);
        } catch (err) {
            logger.log('error', 'invalid JSON', {error: err});
            result[keysFromRedis[i]] = value;
        }
    }

    res.send(200, result);
    return next();
});

server.put('/locations:domain:location', async (req, res, next) => {

    logger.log('debug', 'PUT request to endpoint locations', {domain: req.query.domain, location: req.query.location});

    if (!(config.configurationService)) {
        res.send(404, "Not Found. Redis is not up and running.");
        return next();
    }

    if (req.body && req.body.local_address && (req.query.domain && req.query.location)) {

        if (!config.domains[req.query.domain]) {
            res.send(404, "Not Found. Given domain is not defined in config.json.");
            return next();
        }

        if (!isVarName(req.query.location)) {
            res.send(400, "Bad Request. Given location name is not a valid variable name.");
            return next();
        }


        let urlParseResult = url.parse(req.body.local_address);
        urlParseResult.port = urlParseResult.port ? urlParseResult.port : (urlParseResult.protocol === "https:" ? 443 : 80);

        if (!(urlParseResult.protocol && urlParseResult.host && urlParseResult.port)) {
            res.send(400, "Bad Request. Given local_address " + req.body.local_address + " is not a valid url.");
            return next();
        }

        let result;
        try {
            result = await redisClient.set("bgw-configuration-service-location:" + req.query.domain + "/" + req.query.location, JSON.stringify(req.body));
        } catch (err) {
            res.send(500, err);
            return next();
        }


        if (result === "OK") {
            res.send(200, "OK");
        } else {
            res.send(400, "Bad Request");
        }
    } else {
        res.send(400, "Bad Request");
    }
    return next();
});

server.del('/locations:domain:location', async (req, res, next) => {

    logger.log('debug', 'DEL request to endpoint locations', {domain: req.query.domain, location: req.query.location});

    if (!(config.configurationService)) {
        res.send(404, "Not Found. Redis is not up and running.");
        return next();
    }

    if (req.query.domain && req.query.location) {
        let numOfRemovedKeys;

        try {
            numOfRemovedKeys = await redisClient.del("bgw-configuration-service-location:" + req.query.domain + "/" + req.query.location);
        } catch (err) {
            res.send(500, err);
            return next();
        }
        if (numOfRemovedKeys === 0) {
            res.send(404, "Not Found");
        } else {
            res.send(200, "OK");
        }
    } else {
        res.send(400, "Bad Request");
    }
    return next();
});

server.listen(config.bind_port, () => {
    logger.log('info', config.serviceName + ' listening on port '+config.bind_port);
});



