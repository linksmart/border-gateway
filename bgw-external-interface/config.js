const fs = require('fs');
const jsonFile = "./config/config.json";
let config_file = JSON.parse(fs.readFileSync(jsonFile));

let config = {
    multiple_cores: config_file.multiple_cores || false,
    tls_key: config_file.tls_key,
    tls_cert: config_file.tls_cert,
    request_client_cert: false,
    client_ca_path: false,
    enable_ALPN_mode: false,
    //enable_SNI_mode: false,
    external_domains: config_file.external_domains,
    servers:
        [
            {
                name: "http_proxy",
                bind_addresses: config_file.http_external_interface_bind_addresses || ["0.0.0.0"],
                bind_port: config_file.http_external_interface_bind_port || 443,
                dest_port: config_file.http_proxy_bind_port || 5050,
                dest_address: (config_file.http_proxy_bind_addresses && config_file.http_proxy_bind_addresses[0]) || "127.0.0.1",
                allowed_addresses: []
            },
            {
                name: "mqtt_proxy",
                bind_addresses: config_file.mqtt_external_interface_bind_addresses || [
                    "0.0.0.0"
                ],
                bind_port: config_file.mqtt_external_interface_bind_port || 8883,
                dest_port: config_file.mqtt_proxy_bind_port || 5051,
                dest_address: (config_file.mqtt_proxy_bind_addresses && config_file.mqtt_proxy_bind_addresses[0]) || "127.0.0.1",
                allowed_addresses: []
            },
            {
                name: "websocket_proxy",
                bind_addresses: config_file.websocket_external_interface_bind_addresses || [
                    "0.0.0.0"
                ],
                bind_port: config_file.websocket_external_interface_bind_port || 9002,
                dest_port: config_file.websocket_proxy_bind_port || 5052,
                dest_address: (config_file.websocket_proxy_bind_addresses && config_file.websocket_proxy_bind_addresses[0]) || "127.0.0.1",
                allowed_addresses: []
            }
        ],
    aaa_client: {
        name: "external-interface",
        log_level: 'warn',
        no_timestamp: config_file.aaa_client_no_timestamp || false,
        disable_cat: []
    }
};

require('../bgw-aaa-client').init("EI", config);
module.exports = config;
