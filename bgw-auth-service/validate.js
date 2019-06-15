const config = require('./config');
const logger = require('../logger/log')(config.serviceName, config.logLevel);
const tracer = require('../tracer/trace')(config.serviceName, config.enableDistributedTracing);
const nodefetch = require('node-fetch');
const qs = require("querystring");
//const matchRules = require('./rules');
const jwt = require('jsonwebtoken');
const getPem = require('rsa-pem-from-mod-exp');
const https = require("https");
const tls = require('tls');
const fs = require('fs');
const redis = require("redis");
const asyncRedis = require("async-redis");
let redisClient;
const crypto = require('crypto');
const algorithm = 'aes256';
const wrapFetch = require('zipkin-instrumentation-fetch');
const remoteServiceName = 'openidConnectProvider';
let fetch;
if (config.enableDistributedTracing) {
    fetch = wrapFetch(nodefetch, {tracer, remoteServiceName});
} else {
    fetch = nodefetch;
}

if (config.redis_expiration > 0) {

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
}

function generateAES256KeyBuffer(key) {
    let bufferedKey = Buffer.from(key);

    while (bufferedKey.length < 32) {
        key = key + key;
        bufferedKey = Buffer.from(key)
    }
    key = key.substring(0, 32);
    return Buffer.from(key);
}

function encrypt(value, key) {
    let iv = crypto.randomBytes(16);
    let cipher = crypto.createCipheriv(algorithm, generateAES256KeyBuffer(key), iv);
    let encrypted = cipher.update(value);
    let finalBuffer = Buffer.concat([encrypted, cipher.final()]);
    //Need to retain IV for decryption, so this can be appended to the output with a separator (non-hex for this example)
    return iv.toString('hex') + ':' + finalBuffer.toString('hex');
}

function decrypt(encryptedHex, key) {
    let encryptedArray = encryptedHex.split(':');
    let iv = Buffer.from(encryptedArray[0], 'hex');
    let encrypted = Buffer.from(encryptedArray[1], 'hex');
    let decipher = crypto.createDecipheriv(algorithm, generateAES256KeyBuffer(key), iv);
    let decrypted = decipher.update(encrypted);
    return Buffer.concat([decrypted, decipher.final()]).toString();
}

let agentOptions = {};
if (config.openidCA && fs.existsSync(config.openidCA)) {
    agentOptions = {
        //rejectUnauthorized: false,
        ca: fs.readFileSync(config.openidCA)
    };
}

const agent = new https.Agent(
    agentOptions);

async function getProfile(openid_connect_provider, source, username, password, auth_type, authorizationCode, redirectUri) {
    const client_id = openid_connect_provider.client_id;
    const client_secret = openid_connect_provider.client_secret;
    const audience = openid_connect_provider.audience;
    const issuer = openid_connect_provider.issuer;
    const scope = openid_connect_provider.scope;
    const token_endpoint = openid_connect_provider.token_endpoint;
    const realm_public_key_modulus = openid_connect_provider.realm_public_key_modulus;
    const realm_public_key_exponent = openid_connect_provider.realm_public_key_exponent;

    let authentication_type = auth_type;

    let profile = {};
    let pem = getPem(realm_public_key_modulus, realm_public_key_exponent);
    logger.log('debug', 'generated pem: ' + pem,);
    if (authentication_type === 'access_token') {

        let decoded;
        try {
            decoded = jwt.verify(username, pem, {
                audience: audience,
                issuer: issuer,
                ignoreExpiration: false
            });
        } catch (err) {
            logger.log('error', 'Access token is invalid', {errorName: err.name, errorMessage: err.message});

            if (err.name === "TokenExpiredError") {
                try {
                    decoded = jwt.verify(username, pem, {
                        audience: audience,
                        issuer: issuer,
                        ignoreExpiration: true
                    });
                } catch (err) {
                    logger.log('error', 'Access token is invalid', {errorName: err.name, errorMessage: err.message});
                    return {
                        status: false,
                        error: "Access token is invalid, error = " + err.name + ", " + err.message
                    };
                }
                let issuedAt = new Date(0);
                issuedAt.setUTCSeconds(decoded.iat);
                let expireAt = new Date(0);
                expireAt.setUTCSeconds(decoded.exp);
                logger.log('debug', 'Token lifespan', {issuedAt: issuedAt, expireAt: expireAt});
            }
            return {
                status: false,
                error: "Access token is invalid, error = " + err.name + ", " + err.message
            };
        }
        logger.log('debug', 'Decoded access token', {decoded: decoded});
        profile.at_body = decoded;
    } else { // code before introducing access token functionality

        let retrievedFromRedis = false;
        if (config.redis_expiration > 0 && authentication_type === 'password') {

            try {
                const hash = crypto.createHash('sha256');
                hash.update(token_endpoint + username + password);
                const redisKey = hash.digest('hex');

                const encryptedToken = await redisClient.get(redisKey);
                const ttl = await redisClient.ttl(redisKey);
                if (encryptedToken) {
                    logger.log('debug', 'Retrieved access token from redis', {key: redisKey, ttl: ttl});
                    profile.access_token = decrypt(encryptedToken, password);
                    retrievedFromRedis = true;
                }

            } catch (err) {
                logger.log('error', 'Could not retrieve access token from Redis', {
                    errorName: err.name,
                    errorMessage: err.message
                });
            }
        }

        if (!retrievedFromRedis) {
            const options = {
                method: "POST",
                headers: {'content-type': 'application/x-www-form-urlencoded'},
                body: {
                    'grant_type': authentication_type,
                    'username': username,
                    'password': password,
                    'client_id': client_id,
                    'client_secret': client_secret,
                    'audience': audience,
                    'scope': scope,
                    'code': authorizationCode,
                    'redirect_uri': redirectUri
                },
                agent: agent
            };
            options.body = qs.stringify(options.body);

            try {

                let result = await fetch(`${token_endpoint}`, options); // see https://www.keycloak.org/docs/3.0/securing_apps/topics/oidc/oidc-generic.html
                profile = await result.json();
            } catch (e) {
                logger.log('error', 'DENIED This could be due to auth server being offline or failing', {
                    source: source,
                    errorMessage: e.message
                });
                return {
                    status: false,
                    error: `Error in contacting the openid provider, ensure the openid provider is running and your host is set correctly`
                };
            }

            if (!profile || !profile.access_token) {
                let err = 'Unauthorized';
                const res = {status: false, error: err};
                logger.log('error', 'Invalid user credentials', {error: err, source: source});
                return res;
            }
        }
        let decoded;
        try {
            decoded = jwt.verify(profile.access_token, pem, {
                audience: audience,
                issuer: issuer,
                ignoreExpiration: false
            });
        } catch (err) {
            logger.log('error', 'Access token is invalid', {errorName: err.name, errorMessage: err.message});
            if (err.name === "TokenExpiredError") {
                try {
                    decoded = jwt.verify(profile.access_token, pem, {
                        audience: audience,
                        issuer: issuer,
                        ignoreExpiration: true
                    });
                } catch (err) {
                    logger.log('error', 'Access token is invalid', {errorName: err.name, errorMessage: err.message});
                    return {
                        status: false,
                        error: "Access token is invalid, error = " + err.name + ", " + err.message
                    };
                }
                let issuedAt = new Date(0);
                issuedAt.setUTCSeconds(decoded.iat);
                let expireAt = new Date(0);
                expireAt.setUTCSeconds(decoded.exp);
                logger.log('debug', 'Token lifespan', {issuedAt: issuedAt, expireAt: expireAt});
            }
            return {
                status: false,
                error: "Access token is invalid, error " + err.name + ", " + err.message
            };
        }
        logger.log('debug', 'Successfully decoded access token', {decoded: decoded});
        let issuedAt = new Date(0);
        issuedAt.setUTCSeconds(decoded.iat);
        let expireAt = new Date(0);
        expireAt.setUTCSeconds(decoded.exp);
        logger.log('debug', 'Token lifespan', {issuedAt: issuedAt, expireAt: expireAt});
        if (!retrievedFromRedis && config.redis_expiration > 0 && authentication_type === 'password') {
            const hash = crypto.createHash('sha256');
            hash.update(token_endpoint + username + password);
            const redisKey = hash.digest('hex');
            redisClient.set(redisKey, encrypt(profile.access_token, password), 'EX', config.redis_expiration);
            const ttl = await redisClient.ttl(redisKey);
            logger.log('debug', 'Cached access token with key', {key: redisKey, ttl: ttl});
        }

        let json = Buffer.from(profile.access_token.split(".")[1], 'base64').toString('utf8');
        try {
            profile.at_body = JSON.parse(json);
        } catch (error) {
            logger.log('error', 'Error in JSON.parse', {error: error, json: json});
            return {
                status: false,
                error: "Cannot parse json " + error.name + ", " + error.message
            };
        }
    }

    let hasRules = false;
    let rules = [];
    for (let property in profile.at_body) {
        if (profile.at_body.hasOwnProperty(property)) {

            if (property.includes("bgw_rules")) {
                hasRules = true;
                rules = rules.concat(profile.at_body[property].split(" "));
            }

        }
    }

    if (!profile.at_body || !hasRules) {
        let err = 'Unauthorized';
        const res = {
            status: false,
            error: err
        };
        logger.log('error', 'Invalid user credentials', {error: err, rule: rules, source: source});
        return res;
    }

    profile.user_id = profile.at_body.preferred_username || profile.at_body.sub;
    profile.rules = rules;

    const res = {
        status: true,
        profile: profile
    };

    return res;
}

module.exports.getProfile = getProfile;

