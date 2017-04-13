
const config = require('./config_mgr')();
const request = require('./request')



module.exports = (client_key,method,path)=>{
    const payload = {
      protocol:"MQTT",
      host:config.broker.address,
      port:config.broker.port,
      method:method,
      path:path
    }

    return request(config,payload,client_key)
}
