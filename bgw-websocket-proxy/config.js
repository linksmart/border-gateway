let config = {
    upstream_host: "localhost",
    upstream_port: 5051,
    bind_port: 5052,
    no_auth: false,
    no_auth_mqtt: true,
    realm_public_key_modulus: undefined,
    realm_public_key_exponent: undefined,
    client_id: undefined,
    issuer: undefined,
    aaa_client: {
        name: "websocket-proxy",
        log_level: "",
        no_timestamp: false
    }
};
const fs = require('fs');
const configFromFile = require('../config/config.json');
if (configFromFile["websocket-proxy"]) {
    Object.assign(config, configFromFile["websocket-proxy"]);
}
module.exports = config;
