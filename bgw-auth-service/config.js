const fs = require('fs');
const jsonFile = "./config/config.json";
let config_file = JSON.parse(fs.readFileSync(jsonFile));

let config = {
    bind_port: config_file.auth_service_bind_port || 5059,
    aaa_client: {
        name: "auth-service",
        log_level: "",
        no_timestamp: false,
        host: "",
        openid_clientid: "",
        openid_clientsecret: "",
        openid_authentication_type: "",
        openid_realm_public_key_modulus: "",
        openid_realm_public_key_exponent: "",
        openid_anonymous_user: "",
        openid_anonymous_pass: "",
    }
};
require('../bgw-aaa-client').init("AUTH_SERVICE", config);
module.exports = config;
