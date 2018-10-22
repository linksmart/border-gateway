const fs = require('fs');
const jsonFile = "./config/config.json";
let config_file = JSON.parse(fs.readFileSync(jsonFile));

let config = {
    multiple_cores: config_file.multiple_cores || false,
    mqtt_proxy_bind_addresses: config_file.mqtt_proxy_bind_addresses || [
        "127.0.0.1"
    ],
    mqtt_proxy_bind_port: config_file.mqtt_proxy_bind_port || 5051,
    websocket_proxy_bind_port: config_file.websocket_proxy_bind_port || 5052,

    aaa_client: {
        name: "websocket-proxy",
        log_level: "",
        no_timestamp: false,
        auth_provider: "",
        host: "",
        openid_clientid: "",
        openid_clientsecret: "",
        openid_grant_type: "",
        openid_realm_public_key_modulus: "",
        openid_realm_public_key_exponent: "",
        openid_anonymous_user: "",
        openid_anonymous_pass: "",
    }
};
require('../bgw-aaa-client').init("WEBSOCKET_PROXY", config);
module.exports = config;
