const { setConfig } = require('./config_mgr');

let  index =  {};

index.init = (prefix,config)=>{

    setConfig(prefix,config);

    const {httpAuth, mqttAuth, requestAuth } = require('./auth');
    const {AAA, CAT,debug,isDebugOn} = require('./log');

    index.mqttAuth  =  mqttAuth;
    index.httpAuth  =  httpAuth;
    index.requestAuth  =  requestAuth;
    index.AAA    = AAA ;
    index.CAT    = CAT ;
    index.debug  = debug ;
    index.isDebugOn= isDebugOn ;


    return index;


};

module.exports = index;
