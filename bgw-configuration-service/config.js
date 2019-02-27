const toml = require('toml');
const fs = require('fs');

let config = {
    serviceName: 'configuration-service',
    logLevel: process.env.LOG_LEVEL || 'info',
    bind_port: 5056,
    redis_port: 6379,
    redis_host: undefined,
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
