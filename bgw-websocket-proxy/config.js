const fs = require('fs');
const jsonFile = "./config/config.json";
let config_file = JSON.parse(fs.readFileSync(jsonFile));

let config = {
    single_core: config_file.single_core || false,
    mqtt_proxy_bind_addresses: config_file.mqtt_proxy_bind_addresses,
    mqtt_proxy_bind_port: config_file.mqtt_proxy_bind_port,
    websocket_proxy_bind_port: config_file.websocket_proxy_bind_port,

    aaa_client: {
        name: "websocket-proxy",
        log_level: 'info',
        no_color: false,
        timestamp: config_file.aaa_client_timestamp || false,
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
require('../bgw-aaa-client').init("WEBSOCKET_PROXY", config);
module.exports = config;
