let config = {
    bind_port: 5053,
    aaa_client: {
        name: "auth-service",
        log_level: "",
        no_timestamp: false
    },
    redis_expiration: 0,
    redis_port: 6379,
    redis_host: undefined,
    openid_connect_providers: {
        default: {
            issuer: "",
            token_endpoint: "",
            client_id: "",
            client_secret: "",
            realm_public_key_modulus: "",
            realm_public_key_exponent: "",
            anonymous_user: "anonymous",
            anonymous_pass: "anonymous"
        }
    }
};

const fs = require('fs');
const configFromFile = require('../config/config.json');
Object.assign(config,configFromFile["auth-service"]);

// require('../bgw-aaa-client').init("AUTH_SERVICE", config);
module.exports = config;
