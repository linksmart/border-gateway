const toml = require('toml');
const fs = require('fs');

let config = {
    bind_port: 5056,
    redis_port: 6379,
    redis_host: undefined,
    aaa_client: {
        name: "configuration-service",
        log_level: "",
        no_timestamp: false
    },
    no_auth: false,
    auth_service: "http://localhost:5053/auth",
    openidConnectProviderName: undefined

};
//const configFromFile = require('../config/config.json');
const configFromFile = toml.parse(fs.readFileSync('./config/config.toml'));
if(configFromFile["http-proxy"]) {
    Object.assign(config, configFromFile["http-proxy"]);
}

module.exports = config;
