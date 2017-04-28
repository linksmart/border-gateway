const { setConfig } = require('./config_mgr')

let  index =  {}

index.init = (config)=>{

    setConfig(config);

    const {httpAuth, mqttAuth } = require('./auth')
    const {hmac, genId, sign,verify } = require('./key')
    const {AAA, CAT} = require('./log')

    index.hmac   =  hmac ;
    index.genId  =  genId ;
    index.sign   =  sign ;
    index.verify =  verify ;
    index.mqttAuth  =  mqttAuth;
    index.httpAuth  =  httpAuth;
    index.AAA    = AAA ;
    index.CAT    = CAT ;

    return index;


}

module.exports = index
