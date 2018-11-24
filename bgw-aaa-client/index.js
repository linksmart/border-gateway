const { setConfig } = require('./config_mgr');

let  index =  {};

index.init = (prefix,config)=>{

    setConfig(prefix,config);
    const {AAA, CAT,debug,isDebugOn} = require('./log');
    index.AAA    = AAA ;
    index.CAT    = CAT ;
    index.debug  = debug ;
    index.isDebugOn= isDebugOn ;


    return index;


};

module.exports = index;
