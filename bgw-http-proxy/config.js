let config = {
    multiple_cores: false,
    bind_addresses: [
        "127.0.0.1"
    ],
    bind_port: 5050,
    disable_ei: false,
     change_origin_on: {
        https_req: false,
        http_req: false
    },
    aliases: {},
    domains: {},
    aaa_client: {
        name: "http-proxy",
        log_level: "",
        no_timestamp: false
    },
    no_auth: false,
    auth_service: "http://localhost:5053",
    openidConnectProviderName: undefined
};
require('../bgw-aaa-client').init("HTTP_PROXY", config);
module.exports = config;
