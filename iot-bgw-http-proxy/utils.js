const config = require('./config')
const {transformURI ,decode } = require("./trasnlate_res");
const url = require('url')


const TYPES = {
  FORWARD: 'FORWARD',
  FORWARD_W_T: 'FORWARD_W_T',
  UNKNOWN_REQUEST: 'UNKNOWN_REQUEST',
  PROMPT_BASIC_AUTH: 'PROMPT_BASIC_AUTH',
  INVALID_EXTERNAL_DOMAIN:"INVALID_EXTERNAL_DOMAIN"
}

const bgwIfy = (req) => {
  req.bgw = {}
  const host =  req.headers.host.split(":")[0]
  const public_domain = config.sub_domain_mode ?  host.includes(config.external_domain) : host == config.external_domain;

  if(!public_domain){
    req.bgw = {type:TYPES.INVALID_EXTERNAL_DOMAIN}
    return
  }
  // check if subdomain mode e.g. https://rc.gateway.com or https://gateway.com/rc
  let local_dest =  config.sub_domain_mode ? host.split(config.external_domain).filter((e)=>e!="")[0]:req.url.split(/\/|\?|\#/)[1]
  local_dest = local_dest && local_dest.replace(".","");
  req.url =  config.sub_domain_mode ? req.url : req.url.replace(`/${local_dest}`,"")

  if(config.aliases[local_dest]) {
    req.bgw = {
      forward_address: config.aliases[local_dest].local_address,
      alias:config.aliases[local_dest]
    }
    if(req.bgw.alias.use_basic_auth && !req.headers.authorization){
      req.bgw.type = TYPES.PROMPT_BASIC_AUTH
      return
    }
    const translate = req.bgw.alias.translate_local_addresses
    req.bgw.type = (translate && translate.enabled) ? TYPES.FORWARD_W_T:TYPES.FORWARD
    return
  }

  const decoded_local_dest = local_dest && decode(local_dest)
  if(!config.only_forward_aliases &&local_dest && decoded_local_dest ){
    req.bgw = {type:TYPES.FORWARD, forward_address:decoded_local_dest}
    return
  }
  req.bgw = {type:TYPES.UNKNOWN_REQUEST}
}

module.exports.bgwIfy = bgwIfy;
module.exports.REQ_TYPES = TYPES;
module.exports.transformURI = transformURI
