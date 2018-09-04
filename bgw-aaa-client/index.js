const { setConfig } = require('./config_mgr');

let  index =  {};

index.init = (prefix,config)=>{

    setConfig(prefix,config);

    const {httpAuth, mqttAuth } = require('./auth');
    const {AAA, CAT,debug,isDebugOn} = require('./log');

    index.mqttAuth  =  mqttAuth;
    index.httpAuth  =  httpAuth;
    index.AAA    = AAA ;
    index.CAT    = CAT ;
    index.debug  = debug ;
    index.isDebugOn= isDebugOn ;


    return index;


};

module.exports = index;
