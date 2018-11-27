let config = {
    multiple_cores: false,
    mqtt_proxy_ip: "127.0.0.1",
    mqtt_proxy_port: 5051,
    bind_port: 5052,

    aaa_client: {
        name: "websocket-proxy",
        log_level: "",
        no_timestamp: false
    }
};
require('../bgw-aaa-client').init("WEBSOCKET_PROXY", config);
module.exports = config;
