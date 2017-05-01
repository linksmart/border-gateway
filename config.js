let config = {
bind_address: "127.0.0.1",
bind_port: 5051,
disconnect_on_unauthorized_publish:false,
disconnect_on_unauthorized_subscribe:false,
authorize_response:true,
disconnect_on_unauthorized_response:true,
broker: {
    address:"iot.eclipse.org",
    port:1883,
    username:null,
    password:null
  },
aaa_client:{
    name:"mqtt-proxy",
    log_level:'info',
    no_color:false,
    timestamp:false,
    disable_cat:[],
    secret:"./config/key.pem",
    host: "http://localhost:5055"
  }
}
require('../iot-bgw-aaa-client').init("HTTP_PROXY",config)
module.exports = config
