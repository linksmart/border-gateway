const { setConfig } = require('./config_mgr')



let  index =  module.exports

index.init = (config)=>{

    setConfig(config);

    const mqttAuth= require('./mqtt_auth')
    const httpAuth= require('./http_auth')
    const {hmac, genId, sign,verify } = require('./key')
    const {log, CAT} = require('./log')

    index.hmac   =  hmac ;
    index.genId  =  genId ;
    index.sign   =  sign ;
    index.verify =  verify ;
    index.mqttAuth  =  mqttAuth;
    index.httpAuth  =  httpAuth;
    index.log    = log ;
    index.CAT    = CAT ;

    return index;


}
