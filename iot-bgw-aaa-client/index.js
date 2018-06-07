const { setConfig } = require('./config_mgr');

let  index =  {};

index.init = (prefix,config)=>{

    setConfig(prefix,config);

    const {httpAuth, mqttAuth } = require('./auth');
    //const {hmac, genId, sign,verify } = require('./key')
    const {AAA, CAT,debug,isDebugOn} = require('./log');

    //index.hmac   =  hmac ;
    //index.genId  =  genId ;
    //index.sign   =  sign ;
    //index.verify =  verify ;
    index.mqttAuth  =  mqttAuth;
    index.httpAuth  =  httpAuth;
    index.AAA    = AAA ;
    index.CAT    = CAT ;
    index.debug  = debug ;
    index.isDebugOn= isDebugOn ;


    return index;


};

module.exports = index;
