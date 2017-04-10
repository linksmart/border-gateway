const config = require('./config.json')
const {transformURI ,decode } = require("./trasnlate_res");
const url = require('url')


const TYPES = {
  FORWARD: 'FORWARD',
  FORWARD_W_T: 'FORWARD_W_T',
  UNKNOWN_REQUEST: 'UNKNOWN_REQUEST',
  PROMPT_BASIC_AUTH: 'PROMPT_BASIC_AUTH'
}

const getRequestType = (req) => {

  const host =  req.headers.host.split(":")[0]
  const public_domain = config.sub_domain_mode ?  host.includes(config.external_domain) : host == config.external_domain;

  // check if subdomain mode e.g. https://rc.gateway.com or https://gateway.com/rc
  let local_dest =  config.sub_domain_mode ? host.split(config.external_domain).filter((e)=>e!="")[0]:req.url.split('/')[1]
  local_dest = local_dest && local_dest.replace(".","");
  req.url =  config.sub_domain_mode ? req.url : req.url.replace(`/${local_dest}`,"")

  if(public_domain && config.aliases[local_dest]) {
    let result = {
      forward_address: config.aliases[local_dest].local_address,
      alias:local_dest
    }
    if(config.aliases[local_dest].use_basic_auth && !req.headers.authorization){
      result.type = TYPES.PROMPT_BASIC_AUTH
      return result
    }
    const translate = config.aliases[local_dest].translate_local_addresses
    result.type = (translate && translate.enabled) ? TYPES.FORWARD_W_T:TYPES.FORWARD
    return result;
  }
  const decoded_local_dest = local_dest && decode(local_dest)
  if(public_domain && local_dest && decoded_local_dest ){
    return {type:TYPES.FORWARD, forward_address:decoded_local_dest}
  }
  return {type:TYPES.UNKNOWN_REQUEST}
}

module.exports.config = config;
module.exports.getRequestType = getRequestType;
module.exports.REQ_TYPES = TYPES;
module.exports.transformURI = transformURI
