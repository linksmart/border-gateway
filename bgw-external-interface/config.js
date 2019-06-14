const toml = require('toml');
const fs = require('fs');

let config = {
    serviceName: 'external-interface',
    logLevel: process.env.LOG_LEVEL || 'info',
    tls_key: "",
    tls_cert: "",
    request_client_cert: false,
    client_ca_path: false,
    enable_ALPN_mode: false,
    servers:
        [
            {
                name: "http-proxy",
                bind_addresses: ["0.0.0.0"],
                bind_port: 443,
                dest_port: 5050,
                dest_address: "127.0.0.1"
            },
            {
                name: "mqtt-proxy",
                bind_addresses: ["0.0.0.0"],
                bind_port: 8883,
                dest_port: 5051,
                dest_address: "127.0.0.1"
            },
            {
                name: "websocket-proxy",
                bind_addresses: ["0.0.0.0"],
                bind_port: 9002,
                dest_port: 5052,
                dest_address: "127.0.0.1"
            }
        ]
};

let configFromFile = {};
try {
    configFromFile = toml.parse(fs.readFileSync('./config/config.toml'));
}
catch(e)
{
    console.log("Problem reading ./config/config.toml");
}

if(configFromFile[config.serviceName]) {
    Object.assign(config, configFromFile[config.serviceName]);
}

module.exports = config;
