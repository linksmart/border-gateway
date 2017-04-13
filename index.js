const fs = require('fs')
const crypto = require('crypto');
const { setConfig } = require('./config_mgr')

const hash = (file)=> crypto.createHash('sha256').update(file).digest('base64');

let  index =  module.exports

index.init = (config)=>{
  try{
    const key_file = ""+fs.readFileSync(config.bgw_admin_key)
    config.bgw_admin_key_string = hash(key_file)
    setConfig(config);

    const mqtt = require('./mqtt_auth')
    const http = require('./http_auth')
    const {hmac, genId, sign,verify } = require('./key')

    index.hmac   =  hmac;
    index.genId  =  genId;
    index.sign   =  sign;
    index.verify =  verify;
    index.mqtt   =  mqtt;
    index.http   =  http;

    return index;

  } catch (e) {
    console.log(e);
    console.log('BGW: Fatael Error Border Gateway Admin key file could not be located: BGW auth client, index.js');
    process.exit(1);
  }

}
