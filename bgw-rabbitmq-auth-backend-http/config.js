let config = {
    bind_port: 5054,
    broker: {
        address: "192.168.98.100",
        port: 8183,
        username: false,
        password: false,
        tls: false,
        tls_ca: false,
        tls_client_key: false,
        tls_client_cert: false
    },
    redis_expiration: 180,
    redis_port: 6379,
    redis_host: undefined,
    aaa_client: {
        name: "rabbitmq-auth-backend-http",
        log_level: "",
        no_timestamp: false
    },
    no_auth: false,
    auth_service: "http://localhost:5053/auth",
    openidConnectProviderName: undefined

};

const fs = require('fs');
const configFromFile = require('../config/config.json');
Object.assign(config,configFromFile["rabbitmq-auth-backend-http"]);
//require('../bgw-aaa-client').init("RABBITMQ_AUTH_BACKEND_HTTP", config);
module.exports = config;
