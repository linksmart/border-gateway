let config = {
    bind_port: 5054,
    broker: {
        address: "192.168.98.100",
        port: 8183,
        username: false,
        password: false,
        tls: false,
        tls_ca: false,
        tls_client_key: false,
        tls_client_cert: false
    },
    redis_expiration: 180,
    redis_port: 6378,
    redis_host: "192.168.98.100",
    aaa_client: {
        name: "rabbitmq-auth-backend-http",
        log_level: "",
        no_timestamp: false
    },
    no_auth: false,
    auth_service: "http://localhost:5053/auth",
    openidConnectProviderName: undefined

};
require('../bgw-aaa-client').init("RABBITMQ-AUTH-BACKEND-HTTP", config);
module.exports = config;
