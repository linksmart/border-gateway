const ENABLE_EI = process.env.ENABLE_EI;
const DISABLE_BIND_TLS = process.env.DISABLE_BIND_TLS;

let config = {
    single_core: process.env.SINGLE_CORE || false,
    bind_address: (ENABLE_EI && "127.0.0.1") || "0.0.0.0",
    bind_port: (ENABLE_EI && 5051) || 8883,
disable_bind_tls: ENABLE_EI || false,
    tls_key: process.env.TLS_KEY || "./config/key.pem",
    tls_cert: process.env.TLS_CERT || "./config/srv.pem",
    disconnect_on_unauthorized_publish: false,
    disconnect_on_unauthorized_subscribe: false,
    authorize_response: false,
    disconnect_on_unauthorized_response: false,
    broker: {
        address: "iot.eclipse.org",
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
        log_level: 'info',
        no_color: false,
        timestamp: false,
        disable_cat: [],
        cache_for: '10*60',
        purge_exp_cache_timer: '24*60*60',
        secret: process.env.TLS_KEY || "./config/key.pem",
        host: "http://localhost:5055",
        auth_provider: "internal",
        openid_clientid: "bgw_client",
        openid_clientsecret: "",
        openid_grant_type: "password",
        openid_anonymous_user: "anonymous",
        openid_anonymous_pass: "anonymous"
    }
};
require('../iot-bgw-aaa-client').init("MQTT_PROXY", config);
module.exports = config;
