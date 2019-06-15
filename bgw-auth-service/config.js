const toml = require('toml');
const fs = require('fs');

let config = {
    serviceName: 'auth-service',
    logLevel: process.env.LOG_LEVEL || 'info',
    bind_port: 5053,
    redis_expiration: 0,
    redis_port: 6379,
    redis_host: undefined,
    openidCA: undefined,
    openid_connect_providers: {
        default: {
            issuer: "",
            authorization_endpoint: "",
            token_endpoint: "",
            audience: "",
            client_id: "",
            client_secret: "",
            scope: "openid profile",
            jwks_uri: "",
            realm_public_key_modulus: "",
            realm_public_key_exponent: "",
            anonymous_bgw_rules: "",
            redirect_uri: ""
        }
    },
    enableDistributedTracing: false
};

let configFromFile = {};
try {
    configFromFile = toml.parse(fs.readFileSync('./config/config.toml'));
}
catch(e)
{
    console.log("Problem reading ./config/config.toml");
}

if(configFromFile[config.serviceName]) {
    Object.assign(config, configFromFile[config.serviceName]);
}

module.exports = config;
