const toml = require('toml');
const fs = require('fs');
const axios = require('axios');
const https = require('https');
const {Issuer} = require('openid-client');

let config = {
    serviceName: 'auth-service',
    logLevel: process.env.LOG_LEVEL || 'info',
    bind_port: 5053,
    redis_port: 6379,
    redis_host: 'redis',
    openidCA: undefined,
    openid_connect_providers: {
        default: {
            openid_configuration: "",
            issuer: "",
            authorization_endpoint: "",
            token_endpoint: "",
            audience: "",
            client_id: "",
            client_secret: "",
            scope: "openid profile",
            jwks_uri: "",
            realm_public_key_modulus: "",
            realm_public_key_exponent: "",
            anonymous_bgw_rules: "",
            redirect_uri: "",
            client: {}
        }
    },
    enableDistributedTracing: false
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

const providerKeys = Object.keys(config.openid_connect_providers);
for (const providerKey of providerKeys) {
    const provider = config.openid_connect_providers[providerKey];

    axios({
        method: 'get',
        url: provider.openid_configuration,
        httpsAgent: agent
    }).then(function (response) {
        if (response.status !== 200) {
            console.log("Could not retrieve oidc configuration for oidc provider " + providerKey);
            process.exit(1);
        } else {

            if(!response.data || !response.data.issuer || !response.data.token_endpoint || !response.data.authorization_endpoint || !response.data.jwks_uri)
            {
                console.log("Response from oidc provider does not contain expected values " + response);
                process.exit(1);
            }

            provider.issuer = response.data.issuer;
            provider.token_endpoint = response.data.token_endpoint;
            provider.authorization_endpoint = response.data.authorization_endpoint;
            provider.jwks_uri = response.data.jwks_uri;

            let issuer = new Issuer({
                issuer: provider.issuer,
                authorization_endpoint: provider.authorization_endpoint,
                token_endpoint: provider.token_endpoint,
                jwks_uri: provider.jwks_uri
            }); // => Issuer
            console.log('Set up issuer %s %O', issuer.issuer, issuer.metadata);

            provider.client = new issuer.Client({
                client_id: provider.client_id,
                client_secret: provider.client_secret
            });


            axios({
                method: 'get',
                url: provider.jwks_uri,
                httpsAgent: agent
            }).then(function (response) {
                if (response.status !== 200) {
                    console.log("Could not retrieve public key for oidc provider " + providerKey);
                    process.exit(1);
                } else {
                    const arrayLength = response.data.keys.length;
                    for (let i = 0; i < arrayLength; i++) {
                        let key = response.data.keys[i];
                        if (key.alg === "RS256") {
                            provider.realm_public_key_modulus = key.n;
                            provider.realm_public_key_exponent = key.e;
                            break;
                        }
                    }
                }
            })
                .catch(function (error) {
                    console.log("Could not retrieve public key for oidc provider " + providerKey);
                    console.log(error);
                    process.exit(1);
                });
        }
    })
        .catch(function (error) {
            console.log("Could not retrieve oidc configuration for oidc provider " + providerKey);
            console.log(error);
            process.exit(1);
        });
}


module.exports = config;
