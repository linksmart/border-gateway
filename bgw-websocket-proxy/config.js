const toml = require('toml');
const fs = require('fs');

let config = {
    serviceName: 'websocket-proxy',
    logLevel: process.env.LOG_LEVEL || 'info',
    upstream_host: "localhost",
    upstream_port: 5051,
    bind_port: 5052,
    bind_address: "127.0.0.1",
    no_auth: false,
    no_auth_mqtt: true,
    realm_public_key_modulus: undefined,
    realm_public_key_exponent: undefined,
    client_id: undefined,
    issuer: undefined
};
let configFromFile = toml.parse(fs.readFileSync('./config/config.toml'));

if(configFromFile[config.serviceName]) {
    Object.assign(config, configFromFile[config.serviceName]);
}
module.exports = config;
