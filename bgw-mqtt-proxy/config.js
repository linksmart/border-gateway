const fs = require('fs');
const jsonFile = "./config/config.json";
let config_file = JSON.parse(fs.readFileSync(jsonFile));

let config = {
    single_core: config_file.single_core || true,
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
        log_level: 'warn',
        no_color: false,
        timestamp: !config_file.aaa_client_timestamp && true,
        disable_cat: [],
        cache_for: '10*60',
        purge_exp_cache_timer: '24*60*60',
        secret: config_file.tls_key,
        host: "http://localhost:5055",
        auth_provider: "openid",
        openid_clientid: config_file.aaa_client_openid_clientid,
        openid_clientsecret: "",
        openid_grant_type: "password",
        openid_anonymous_user: "anonymous",
        openid_anonymous_pass: "anonymous"
    }
};
require('../bgw-aaa-client').init("MQTT_PROXY", config);
module.exports = config;
