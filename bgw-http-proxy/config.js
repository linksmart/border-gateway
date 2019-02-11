let config = {
    bind_addresses: [
        "127.0.0.1"
    ],
    bind_port: 5050,
    no_tls: false,
     change_origin_on: {
        https_req: false,
        http_req: false
    },
    domains: {},
    redis_host: undefined,
    redis_port: 6379,
    aaa_client: {
        name: "http-proxy",
        log_level: "",
        no_timestamp: false
    },
    no_auth: false,
    auth_service: "http://localhost:5053/auth",
    configuration_service: "http://localhost:5056",
    openidConnectProviderName: undefined
};

const fs = require('fs');
const configFromFile = require('../config/config.json');
Object.assign(config,configFromFile["http-proxy"]);
module.exports = config;
