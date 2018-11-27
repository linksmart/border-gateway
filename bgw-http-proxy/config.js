let config = {
    multiple_cores: false,
    bind_addresses: [
        "127.0.0.1"
    ],
    bind_port: 5050,
    disable_ei: false,
    only_forward_aliases: false,
    override_authorization_header: "",
    change_origin_on: {
        https_req: false,
        http_req: false
    },
    redirect_to_original_address_on_proxy_error: false,
    aliases: {},
    domains: {},
    aaa_client: {
        name: "http-proxy",
        log_level: "",
        no_timestamp: false
    },
    no_auth: false,
    auth_service: "http://localhost:5053",
    openid_connect_provider_name: undefined
};
require('../bgw-aaa-client').init("HTTP_PROXY", config);
module.exports = config;
