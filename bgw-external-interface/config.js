const fs = require('fs');
const jsonFile = "./config/config.json";
let config_file = JSON.parse(fs.readFileSync(jsonFile));

let config = {
    single_core: config_file.single_core || true,
    private_bgw: false,
    tls_key: config_file.tls_key,
    tls_cert: config_file.tls_cert,
    request_client_cert: false,
    client_ca_path: false,
    enable_ALPN_mode: false,
    enable_SNI_mode: false,
    external_domain: config_file.external_domain,
    servers:
        [
            {
                name: "http_proxy",
                bind_addresses: config_file.http_external_interface_bind_addresses || ["0.0.0.0"],
                bind_port: config_file.http_external_interface_bind_port || 443,
                dest_port: config_file.http_proxy_bind_port || 5050,
                dest_address: config_file.http_proxy_bind_addresses[0] || "127.0.0.1",
                allowed_addresses: []
            },
            {
                name: "mqtt_proxy",
                bind_addresses: config_file.mqtt_external_interface_bind_addresses || [
                    "0.0.0.0"
                ],
                bind_port: config_file.mqtt_external_interface_bind_port || 8883,
                dest_port: config_file.mqtt_proxy_bind_port || 5051,
                dest_address: config_file.mqtt_proxy_bind_addresses[0] || "127.0.0.1",
                allowed_addresses: []
            },
            {
                name: "websocket_proxy",
                bind_addresses: config_file.websocket_external_interface_bind_addresses || [
                    "0.0.0.0"
                ],
                bind_port: config_file.websocket_external_interface_bind_port || 9002,
                dest_port: config_file.websocket_proxy_bind_port || 5052,
                dest_address: config_file.websocket_proxy_bind_addresses[0] || "127.0.0.1",
                allowed_addresses: []
            }
        ],
    //global_allowed_addresses: ["0.0.0.0/0"],
    aaa_client: {
        name: "external-interface",
        log_level: 'info',
        no_color: false,
        timestamp: config_file.aaa_client_timestamp || false,
        disable_cat: []
    }
};

require('../bgw-aaa-client').init("EI", config);
module.exports = config;
