const toml = require('toml');
const fs = require('fs');

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
    aaa_client: {
        name: "http-proxy",
        log_level: "debug",
        no_timestamp: false
    },
    no_auth: false,
    auth_service: "http://localhost:5053/auth",
    configurationService: undefined,
    redis_host: undefined,
    redis_port: 6379,
    openidConnectProviderName: undefined
};


let configFromFile = toml.parse(fs.readFileSync('./config/config.toml'));

if(configFromFile["http-proxy"]) {
    Object.assign(config, configFromFile["http-proxy"]);
}

module.exports = config;
