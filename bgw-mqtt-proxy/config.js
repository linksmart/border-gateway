const toml = require('toml');
const fs = require('fs');

let config = {
    serviceName: 'mqtt-proxy',
    logLevel: process.env.LOG_LEVEL || 'info',
     bind_addresses: [
        "127.0.0.1"
    ],
    bind_port: 5051,
    disconnect_on_unauthorized_publish: false,
    disconnect_on_unauthorized_subscribe: false,
    authorize_response: false,
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
    no_auth: false,
    auth_service: "http://localhost:5053",
    openidConnectProviderName: undefined
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
