const fs = require('fs')
const crypto = require('crypto');
const hash = (message)=> crypto.createHash('sha256').update(message).digest('base64');

let config = false ;

const getConfig = ()=> {
  if(!config){
    console.error(`BGW: Fatal Error you must init the auth client in your config.js (e.g. require('../iot-bgw-aaa-client').init(prefix,config)) and make sure to require config first thing in index.js`);
    process.exit(1);
  }
  return config
}

const setConfig = (prefix,c)=> {
  parseConfig('AAA_CLIENT',c.aaa_client)
  parseConfig(`${prefix}_AAA_CLIENT`,c.aaa_client)
  parseConfig(prefix,config)

  setupAdminKey(c)
  setupBgwAuthAlias(c)
  config = c
}

const parseConfig = (prefix, c) => {
  const ENV = (v)=> {
    const env = process.env[`${prefix}_${v.toUpperCase()}`]
    if (!env)
      return false
    try {
      return JSON.parse(env)
    } catch(e){
      return env
    }
  }
  Object.keys(c).forEach(function(key) {
       c[key] = ENV(key) || c[key]
  });
}


const setupAdminKey = (c)=> {
  if(!(c.aaa_client && c.aaa_client.secret)){
    return
  }
  let key
  if(fs.existsSync(c.aaa_client.secret)){
    key = ""+fs.readFileSync(c.aaa_client.secret)
  } else {
    console.warn(c.aaa_client.name,"aaa_client.secret is not a valid file path, we will use the provided string to generate the bgw secret")
    key = c.aaa_client.secret
  }
  c.aaa_client.secret = hash(key);
}

const setupBgwAuthAlias = (c)=>{
    // if this config belongs to http proxy set alias for bgw-auth
    c.aaa_client && c.aaa_client.secret && c.aaa_client.host && c.aliases && (c.aliases['bgw-auth']={
        local_address:c.aaa_client.host,
        override_authorization_header: c.aaa_client.secret
    })
}

module.exports = getConfig;
module.exports.setConfig = setConfig;
