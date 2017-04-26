const fs = require('fs')
const crypto = require('crypto');
const hash = (message)=> crypto.createHash('sha256').update(message).digest('base64');

let config = false ;

const getConfig = ()=> {
  if(!config){
    console.error(`BGW: Fatal Error you must init the auth client in your entry index.js file e.g. require('iot-bgw-auth-client').init(config)`);
    process.exit(1);
  }

  return config
}

const setConfig = (c)=> {
  setupAdminKey(c)
  setupBgwAuthAlias(c)
  config = c
}


const setupAdminKey = (c)=> {
  if(!c.bgw_admin_key){
    return
  }
  let key
  if(fs.existsSync(c.bgw_admin_key)){
    key = ""+fs.readFileSync(c.bgw_admin_key)
  } else {
    console.warn(" bgw_admin_key is not a valid file path, we will use the provided string to generate the bgw admin key")
    key = c.bgw_admin_key
  }
  c.bgw_admin_key = hash(key);
}

const setupBgwAuthAlias = (c)=>{
    // if this config belongs to http proxy set alias for bgw-auth
    c.aliases && (c.aliases['bgw-auth']={
        local_address:c.auth_server,
        override_authorization_header: c.bgw_admin_key
    })
}

module.exports = getConfig;
module.exports.setConfig = setConfig;
