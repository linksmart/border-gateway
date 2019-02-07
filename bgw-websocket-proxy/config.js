let config = {
    mqtt_proxy_ip: "127.0.0.1",
    mqtt_proxy_port: 5051,
    bind_port: 5052,

    aaa_client: {
        name: "websocket-proxy",
        log_level: "",
        no_timestamp: false
    }
};
const fs = require('fs');
const configFromFile = require('../config/config.json');
Object.assign(config,configFromFile["websocket-proxy"]);
//require('../bgw-aaa-client').init("WEBSOCKET_PROXY", config);
module.exports = config;
