const config = require("./config");
const fetch = require('node-fetch');
const qs = require("querystring");
const matchRules = require('./rules');
const jwt = require('jsonwebtoken');
const getPem = require('rsa-pem-from-mod-exp');
const https = require("https");
const {AAA, CAT} = require('../bgw-aaa-client');
const redis = require("redis");
const asyncRedis = require("async-redis");
let redisClient;
let asyncRedisClient;
const crypto = require('crypto');
const algorithm = 'aes256';
const inputEncoding = 'utf8';
const outputEncoding = 'hex';
if (config.redis_expiration > 0) {

    redisClient = redis.createClient({port: config.redis_port, host: config.redis_host});
    asyncRedisClient = asyncRedis.decorate(redisClient);
}

function encrypt(value, key) {
    let cipher = crypto.createCipher(algorithm, key);
    let encrypted = cipher.update(value, inputEncoding, outputEncoding);
    encrypted += cipher.final(outputEncoding);
    return encrypted;
}

function decrypt(encrypted, key) {
    let decipher = crypto.createDecipher(algorithm, key);
    let decrypted = decipher.update(encrypted, outputEncoding, inputEncoding);
    decrypted += decipher.final(inputEncoding);
    return decrypted;
}

//temporary workaround because of ATOS´ self-signed certificate for Keycloak
const agent = new https.Agent({
    rejectUnauthorized: false
});

let parse_credentials = {
    password: (username, password) => ({username, password}),
    access_token: (access_token) => ({access_token}),
};

module.exports = async (rule, openid_connect_provider, source, username, password, auth_type) => {

    const anonymous_user = openid_connect_provider.anonymous_user || 'anonymous';
    const client_id = openid_connect_provider.client_id;
    const client_secret = openid_connect_provider.client_secret;
    const issuer = openid_connect_provider.issuer;
    const token_endpoint = openid_connect_provider.token_endpoint;
    const realm_public_key_modulus = openid_connect_provider.realm_public_key_modulus;
    const realm_public_key_exponent = openid_connect_provider.realm_public_key_exponent;

    let authentication_type = username === anonymous_user ? 'password' : auth_type;
    let req_credentials = parse_credentials[authentication_type](username, password);

    let profile = {};
    let pem = getPem(realm_public_key_modulus, realm_public_key_exponent);
    if (authentication_type === 'access_token') {

        let decoded;
        try {
            decoded = jwt.verify(req_credentials.access_token, pem, {
                audience: client_id,
                issuer: issuer,
                ignoreExpiration: false
            });
        }
        catch (err) {
            AAA.log(CAT.INVALID_ACCESS_TOKEN, "Access token is invalid", err.name, err.message);
            return {
                status: false,
                error: "Access token is invalid, error = " + err.name + ", " + err.message
            };
        }
        AAA.log(CAT.DEBUG, "Decoded access token:\n", decoded);
        profile.at_body = decoded;
    }

    else { // code before introducing access token functionality

        if (config.redis_expiration > 0) {

            try {
                const hash = crypto.createHash('sha256');
                hash.update(token_endpoint + username + password);
                const redisKey = hash.digest('utf8');
                AAA.log(CAT.DEBUG, "redisKey = " + redisKey);

                const encryptedToken = await redisClient.get(redisKey);
                if (encryptedToken) {
                    AAA.log(CAT.DEBUG, "encryptedToken = " + encryptedToken);
                    profile.access_token = decrypt(encryptedToken, password);
                    AAA.log(CAT.DEBUG, "Retrieved access token from redis.");
                }

            }
            catch (err) {
                AAA.log(CAT.DEBUG, "Could not retrieve access token from Redis: ", err);
            }
        }

        if (!profile.access_token) {
            const options = {
                method: "POST",
                headers: {'content-type': 'application/x-www-form-urlencoded'},
                body: {
                    'grant_type': authentication_type,
                    'client_id': client_id,
                    'client_secret': client_secret
                },
                agent: agent
            };
            Object.assign(options.body, req_credentials);
            options.body = qs.stringify(options.body);

            try {

                let result = await fetch(`${token_endpoint}`, options); // see https://www.keycloak.org/docs/3.0/securing_apps/topics/oidc/oidc-generic.html
                profile = await result.json();
                //isDebugOn && debug('open id server result ', JSON.stringify(profile));
            } catch (e) {
                AAA.log(CAT.WRONG_AUTH_SERVER_RES, "DENIED This could be due to auth server being offline or failing", rule, source);
                return {
                    status: false,
                    error: `Error in contacting the openid provider, ensure the openid provider is running and your bgw aaa_client host is correct`
                };
            }

            if (!profile || !profile.access_token) {
                let err = 'Unauthorized';
                const res = {status: false, error: err};
                AAA.log(CAT.INVALID_USER_CREDENTIALS, err, rule, source);
                return res;
            }
        }
        let decoded;
        try {
            decoded = jwt.verify(profile.access_token, pem, {
                audience: client_id,
                issuer: issuer,
                ignoreExpiration: false
            });
        }
        catch (err) {
            AAA.log(CAT.INVALID_ACCESS_TOKEN, "Access token is invalid", err.name, err.message);
            return {
                status: false,
                error: "Access token is invalid, error " + err.name + ", " + err.message
            };
        }
        AAA.log(CAT.DEBUG, "Successfully decoded access token:\n", decoded);
        if (config.redis_expiration > 0) {
            const hash = crypto.createHash('sha256');
            hash.update(token_endpoint + username + password);
            const redisKey = hash.digest('utf8');
            AAA.log(CAT.DEBUG, "redisKey = " + redisKey);
            redisClient.set(redisKey, encrypt(profile.access_token, password), 'EX', config.redis_expiration);
        }

        let json = new Buffer(profile.access_token.split(".")[1], 'base64').toString('ascii');
        try {
            profile.at_body = JSON.parse(json);
        } catch (error) {
            AAA.log(CAT.DEBUG, "Error in JSON.parse, error = ",error," json = ",json);
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

    if (!profile.at_body || !profile.at_body.preferred_username || !hasRules) {
        let err = 'Unauthorized';
        const res = {
            status: false,
            error: err
        };
        AAA.log(CAT.INVALID_USER_CREDENTIALS, err, rule, source);
        return res;
    }

    profile.user_id = profile.at_body.preferred_username;
    profile.rules = rules;
    return matchRules(profile, rule, source);
};

