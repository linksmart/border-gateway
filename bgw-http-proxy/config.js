const fs = require('fs');
const jsonFile = "./config/config.json";
let config_file = JSON.parse(fs.readFileSync(jsonFile));

let config = {
    multiple_cores: config_file.multiple_cores || false,
    bind_addresses: config_file.http_proxy_bind_addresses || [
        "127.0.0.1"
    ],
    bind_port: config_file.http_proxy_bind_port || 5050,
    disable_ei: config_file.disable_ei || false,
    tls_key: config_file.tls_key,
    tls_cert: config_file.tls_cert,
    //sub_domain_mode: config_file.http_proxy_sub_domain_mode || false,
    only_forward_aliases: false,
    override_authorization_header: "",
    change_origin_on: {
        https_req: false,
        http_req: false
    },
    redirect_to_original_address_on_proxy_error: false,
    // redirect_on_invalid_external_domain: false,
    aliases: {},
    domains: {},
    aaa_client: {
        name: "http-proxy",
        log_level: "",
        no_timestamp: false,
        auth_provider: "",
        host: "",
        openid_clientid: "",
        openid_clientsecret: "",
        openid_grant_type: "",
        openid_realm_public_key_modulus: "",
        openid_realm_public_key_exponent: "",
        openid_anonymous_user: "",
        openid_anonymous_pass: "",
    }
};
require('../bgw-aaa-client').init("HTTP_PROXY", config);
module.exports = config;
