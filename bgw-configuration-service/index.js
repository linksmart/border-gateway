const config = require('./config');

const {AAA, CAT} = require('../bgw-aaa-client');
const app = require('express')();
const bodyParser = require('body-parser');
const redis = require("redis");
const asyncRedis = require("async-redis");
let redisClient;


AAA.log(CAT.DEBUG, 'configuration-service', "redis_host", config.redis_host);

if (config.redis_host) {
    redisClient = redis.createClient({port: config.redis_port, host: config.redis_host});
    asyncRedis.decorate(redisClient);
}

app.use(bodyParser.json());

app.get('/locations', async (req, res) => {

    AAA.log(CAT.DEBUG, 'configuration-service', "Request to redis endpoint locations");

    if(!(config.redis_host))
    {
        res.status(404).send("Not Found");
        return;
    }

    let result = {};

    let keysFromRedis = await redisClient.keys("location *");
    AAA.log(CAT.DEBUG, 'configuration-service', "keysFromRedis", keysFromRedis);

    for (let i = 0; i < keysFromRedis.length; i++) {
        let value = await redisClient.get(keysFromRedis[i]);
        AAA.log(CAT.DEBUG, 'configuration-service', "value", value);
        try {
            result[keysFromRedis[i]] = JSON.parse(value);
        }
        catch (err) {
            AAA.log(CAT.DEBUG, 'configuration-service', "invalid JSON", err);
            result[keysFromRedis[i]] = value;
        }
    }

    res.status(200).send(JSON.stringify(result));
    return;
});

app.put('/locations', async (req, res) => {

    AAA.log(CAT.DEBUG, 'configuration-service', "Request to redis endpoint with key", req.body.key, "and value", req.body.value, "and expiration", req.body.expiration || 0);

    if(!(config.redis_host))
    {
        res.status(404).send("Not Found");
        return;
    }

    if (req.body.key && req.body.value) {

        let result;
        if (req.body.expiration && req.body.expiration > 0) {
            result = await redisClient.set(req.body.key, JSON.stringify(req.body.value), 'EX', req.body.expiration);
        }
        else {
            result = await redisClient.set(req.body.key, JSON.stringify(req.body.value));
        }

        if (result === "OK") {
            res.status(200).send("OK");
        }
        else {
            res.status(400).send("Bad Request");
        }
    }
    else {
        res.status(400).send("Bad Request");
    }
    return;
});

app.delete('/locations', async (req, res) => {

    AAA.log(CAT.DEBUG, 'configuration-service', "Request to redis endpoint with key", req.body.key);

    if(!(config.redis_host))
    {
        res.status(404).send("Not Found");
        return;
    }

    let numOfRemovedKeys;

    numOfRemovedKeys = await redisClient.del(req.body.key);

    if (numOfRemovedKeys === 0) {
        res.status(404).send("Not Found");
    }
    else {
        res.status(200).send("OK");
    }
    return;
});

app.listen(config.bind_port, () =>
    AAA.log(CAT.PROCESS_START, 'configuration-service', `configuration-service listening on port ${config.bind_port}`));


