const config = require('./config');
const {AAA, CAT} = require('../bgw-aaa-client');
const app = require('express')();
const axios = require('axios');
const crypto = require('crypto');
const bodyParser = require('body-parser');
const redis = require("redis");
const asyncRedis = require("async-redis");
let redisClient;

if (config.redis_host) {
    redisClient = redis.createClient({port: config.redis_port, host: config.redis_host});
    asyncRedis.decorate(redisClient);
}

async function retrieveRules(username) {
    let rules;
    try {
        const hash = crypto.createHash('sha256');
        hash.update(username);
        const redisKey = hash.digest('hex');

        rules = await redisClient.get(redisKey);
        let rulesArray = JSON.parse(rules);
        AAA.log(CAT.DEBUG,'rabbitmq-auth-backend-http', "typeof rules", typeof rules);
        const ttl = await redisClient.ttl(redisKey);
        AAA.log(CAT.DEBUG,'rabbitmq-auth-backend-http', "Retrieved rules ", rulesArray, " for username ", username, " from redis, ttl is ", ttl);
    }
    catch (err) {
        AAA.log(CAT.DEBUG,'rabbitmq-auth-backend-http', "Could not retrieve rules from Redis: ", err);
    }
    return rules;
}

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));


async function requestToAuthService(username, password) {

    let authorization = 'Basic ' + Buffer.from(username + ':' + password).toString('base64');

    let response;
    try {
        response = await axios({
            method: 'post',
            headers: {authorization: authorization || ""},
            url: config.auth_service + "/bgw/authenticate",
            data: {
                openidConnectProviderName: config.openidConnectProviderName || 'default'
            }
        });
    }
    catch (error) {
        AAA.log(CAT.DEBUG,'rabbitmq-auth-backend-http', 'auth-service returned an error message:', error.name, error.message);
        return false;
    }

    if (response.data.isAuthenticated) {
        const hash = crypto.createHash('sha256');
        hash.update(username);
        const redisKey = hash.digest('hex');
        redisClient.set(redisKey, JSON.stringify(response.data.rules), 'EX', config.redis_expiration);
        const ttl = await redisClient.ttl(redisKey);
        AAA.log(CAT.DEBUG,'rabbitmq-auth-backend-http', "Cached rules ", JSON.stringify(response.data.rules), " with key ", redisKey, " in redis, ttl is ", ttl);
        return true;
    }
    else {
        return false;
    }
}

app.all('/auth/user', async (req, res) => {

        AAA.log(CAT.DEBUG,'rabbitmq-auth-backend-http', "Request to endpoint user");
        //MQTT connection (maybe AMQP?)
        if (req.body.vhost === "/") {

            if (config.no_auth) {

                res.status(200).send("allow");
            }

            isAuthorized = await requestToAuthService(req.body.username, req.body.password);

            if (isAuthorized) {
                res.status(200).send("allow");
            }
            else {
                res.status(200).send("deny");
            }
        }
        //rabbit-management etc.
        else {
            res.status(200).send("allow management policymaker monitoring administrator");
        }
    }
);

app.all('/auth/vhost', async (req, res) => {

        AAA.log(CAT.DEBUG,'rabbitmq-auth-backend-http', "Request to endpoint vhost");
        const rules = await retrieveRules(req.body.username);
        res.status(200).send("allow");
        return;
    }
);

app.all('/auth/resource', async (req, res) => {

        AAA.log(CAT.DEBUG,'rabbitmq-auth-backend-http', "Request to endpoint resource");
        const rules = await retrieveRules(req.body.username);
        res.status(200).send("allow");
        return;
    }
);

app.all('/auth/topic', async (req, res) => {

        AAA.log(CAT.DEBUG,'rabbitmq-auth-backend-http', "Request to endpoint topic");
        const rules = await retrieveRules(req.body.username);
        res.status(200).send("allow");
        return;
    }
);


app.listen(config.bind_port, () =>
    AAA.log(CAT.PROCESS_START,'rabbitmq-auth-backend-http', `auth-service listening on port ${config.bind_port}`));


