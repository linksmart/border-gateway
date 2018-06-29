const fs = require('fs');
const jsonFile = "./config/config.json";
let config_file = JSON.parse(fs.readFileSync(jsonFile));

let config = {
    single_core: config_file.single_core || false,
    bind_addresses: config_file.http_proxy_bind_addresses,
    bind_port: config_file.http_proxy_bind_port,
    enable_ei: process.env.ENABLE_EI,
    external_domain: config_file.external_domain,
    tls_key: config_file.tls_key,
    tls_cert: config_file.tls_cert,
//    external_port: "443",
    sub_domain_mode: false,
    only_forward_aliases: false,
    override_authorization_header: "",
    disable_bgw_key_as_url_query: false,
    change_origin_on: {
        https_req: false,
        http_req: false
    },
    redirect_to_original_address_on_proxy_error: false,
    redirect_on_invalid_external_domain: false,
    aliases: {
//        rc: {
//            local_address: "http://alman:8081",
//            change_origin_on: {
//                https_req: false,
//                http_req: false
//            },
//            translate_local_addresses: {
//                enabled: false,
//                whitelist: ["*.ietf.org"]
//            },
//            insecure: false,
//            override_authorization_header: "",
//            use_basic_auth: false
//        },
//
//        sc: {
//            local_address: "http://localhost:8082",
//            use_basic_auth: false
//        }
    },
    aaa_client: {
        name: "http-proxy",
        log_level: 'info',
        no_color: false,
        timestamp: config_file.aaa_client_timestamp || false,
        disable_cat: [],
        cache_for: '10*60',
        purge_exp_cache_timer: '24*60*60',
        secret: config_file.tls_key,
        host: "http://localhost:5055",
        auth_provider: "openid",
        openid_clientid: config_file.aaa_openid_client_id,
        openid_clientsecret: "",
        openid_grant_type: "password",
        openid_anonymous_user: "anonymous",
        openid_anonymous_pass: "anonymous"
    }
};

require('../bgw-aaa-client').init("HTTP_PROXY", config);
module.exports = config;
