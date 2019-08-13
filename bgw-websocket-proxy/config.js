const toml = require('toml');
const fs = require('fs');
const axios = require('axios');
const https = require('https');

let config = {
    serviceName: 'websocket-proxy',
    logLevel: process.env.LOG_LEVEL || 'info',
    mqtt_proxy_host: "localhost",
    mqtt_proxy_port: 5051,
    ws_upstream_base_url: undefined,
    bind_port: 5052,
    bind_address: "127.0.0.1",
    no_auth: false,
    auth_service: "http://localhost:5053",
    openid_configuration: "",
    realm_public_key_modulus: undefined,
    realm_public_key_exponent: undefined,
    audience: undefined,
    client_id: undefined,
    client_secret: undefined,
    issuer: undefined
};

let configFromFile = {};
try {
    configFromFile = toml.parse(fs.readFileSync('./config/config.toml'));
} catch (e) {
    console.log("Problem reading ./config/config.toml");
}

if (configFromFile[config.serviceName]) {
    Object.assign(config, configFromFile[config.serviceName]);
}

let agentOptions = {};
if (config.openidCA && fs.existsSync(config.openidCA)) {
    agentOptions = {
        ca: fs.readFileSync(config.openidCA)
    };
}

const agent = new https.Agent(
    agentOptions);

    axios({
        method: 'get',
        url: config.openid_configuration,
        httpsAgent: agent
    }).then(function (response) {
        if (response.status !== 200) {
            console.log("Could not retrieve oidc configuration for oidc provider");
            process.exit(1);
        } else {
            config.issuer = response.data.issuer;
            config.token_endpoint = response.data.token_endpoint;
            config.authorization_endpoint = response.data.authorization_endpoint;
            config.jwks_uri = response.data.jwks_uri;

            axios({
                method: 'get',
                url: config.jwks_uri,
                httpsAgent: agent
            }).then(function (response) {
                if (response.status !== 200) {
                    console.log("Could not retrieve public key for oidc provider");
                    process.exit(1);
                } else {
                    const arrayLength = response.data.keys.length;
                    for (let i = 0; i < arrayLength; i++) {
                        let key = response.data.keys[i];
                        if (key.alg === "RS256") {
                            config.realm_public_key_modulus = key.n;
                            config.realm_public_key_exponent = key.e;
                            break;
                        }
                    }
                }
            })
                .catch(function (error) {
                    console.log("Could not retrieve public key for oidc provider");
                    console.log(error);
                    process.exit(1);
                });
        }
    })
        .catch(function (error) {
            console.log("Could not retrieve oidc configuration for oidc provider");
            console.log(error);
            process.exit(1);
        });



module.exports = config;
