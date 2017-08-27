let config = {
cluster_mode: process.env.CLUSTER_MODE || false,
bind_address: "0.0.0.0",
bind_port: 5051,
direct_tls_mode:false,
tls_key: process.env.TLS_KEY || "./config/key.pem",
tls_cert: process.env.TLS_CERT || "./config/srv.pem",
disconnect_on_unauthorized_publish:false,
disconnect_on_unauthorized_subscribe:false,
authorize_response:false,
disconnect_on_unauthorized_response:false,
broker: {
    address:"iot.eclipse.org",
    port:1883,
    username:false,
    password:false,
    tls:false,
    tls_ca: false,
    tls_client_key:false,
    tls_client_cert:false,
  },
aaa_client:{
    name:"mqtt-proxy",
    log_level:'info',
    no_color:false,
    timestamp:false,
    disable_cat:[],
    cache_for: '10*60',
    purge_exp_cache_timer:'24*60*60',
    secret:process.env.TLS_KEY || "./config/key.pem",
    host: "http://localhost:5055",
    auth_provider: "internal",
    openid_clientid : "bgw_client",
    openid_clientsecret: "",
    openid_grant_type:"password",
    openid_anonymous_user: "anonymous",
    openid_anonymous_pass: "anonymous"
  }
}
require('../iot-bgw-aaa-client').init("MQTT_PROXY",config)
module.exports = config
