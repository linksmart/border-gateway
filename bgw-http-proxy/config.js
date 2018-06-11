let config = {
    single_core: process.env.SINGLE_CORE || false,
    bind_address: process.env.HTTP_PROXY_BIND_ADDRESS,
    bind_port: process.env.HTTP_PROXY_BIND_PORT,
    enable_ei: process.env.ENABLE_EI,
    external_domain: process.env.EXTERNAL_DOMAIN || "bgw.hareeqi.com",
    tls_key: process.env.TLS_KEY || "./config/key.pem",
    tls_cert: process.env.TLS_CERT || "./config/srv.pem",
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
        timestamp: false,
        disable_cat: [],
        cache_for: '10*60',
        purge_exp_cache_timer: '24*60*60',
        secret: process.env.TLS_KEY || "./config/key.pem",
        host: "http://localhost:5055",
        auth_provider: "openid",
        openid_clientid: "bgw_client",
        openid_clientsecret: "",
        openid_grant_type: "password",
        openid_anonymous_user: "anonymous",
        openid_anonymous_pass: "anonymous"
    }
};

require('../bgw-aaa-client').init("HTTP_PROXY", config);
module.exports = config;
