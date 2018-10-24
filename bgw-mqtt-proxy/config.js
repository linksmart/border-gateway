const fs = require('fs');
const jsonFile = "./config/config.json";
let config_file = JSON.parse(fs.readFileSync(jsonFile));

let config = {
    multiple_cores: config_file.multiple_cores || false,
    bind_addresses: config_file.mqtt_proxy_bind_addresses || [
        "127.0.0.1"
    ],
    bind_port: config_file.mqtt_proxy_bind_port || 5051,
    tls_key: config_file.tls_key,
    tls_cert: config_file.tls_cert,
    disconnect_on_unauthorized_publish: false,
    disconnect_on_unauthorized_subscribe: false,
    authorize_response: false,
    disconnect_on_unauthorized_response: false,
    broker: {
        address: "localhost",
        port: 1883,
        username: false,
        password: false,
        tls: false,
        tls_ca: false,
        tls_client_key: false,
        tls_client_cert: false
    },
    aaa_client: {
        name: "mqtt-proxy",
        log_level: "",
        no_timestamp: false,
        host: "",
        openid_clientid: "",
        openid_clientsecret: "",
        openid_authentication_type: "",
        openid_realm_public_key_modulus: "",
        openid_realm_public_key_exponent: "",
        openid_anonymous_user: "",
        openid_anonymous_pass: "",
    }
};
require('../bgw-aaa-client').init("MQTT_PROXY", config);
module.exports = config;
