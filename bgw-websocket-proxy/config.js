const toml = require('toml');
const fs = require('fs');

let config = {
    upstream_host: "localhost",
    upstream_port: 5051,
    bind_port: 5052,
    bind_address: "127.0.0.1",
    no_auth: false,
    no_auth_mqtt: true,
    realm_public_key_modulus: undefined,
    realm_public_key_exponent: undefined,
    client_id: undefined,
    issuer: undefined,
    aaa_client: {
        name: "websocket-proxy",
        log_level: "debug",
        no_timestamp: false
    }
};
let configFromFile = toml.parse(fs.readFileSync('./config/config.toml'));

if(configFromFile["websocket-proxy"]) {
    Object.assign(config, configFromFile["websocket-proxy"]);
}
module.exports = config;
