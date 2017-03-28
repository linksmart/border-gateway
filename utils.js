const config = require('./config.json')
const transformURI = require("./trasnlate_res");
const url = require('url')

const decode = (data)=> new Buffer(data, 'base64').toString('ascii');

const TYPES = {
  FORWARD: 'FORWARD',
  FORWARD_W_T: 'FORWARD_W_T',
  UNKNOWN_REQUEST: 'UNKNOWN_REQUEST'
}

const getRequestType = (req) => {
  const host =  req.headers.host.split(":")[0]
  const public_domain = config.sub_domain_mode ?  host.includes(config.external_domain) : host == config.external_domain;

  // check if subdomain mode e.g. https://rc.gateway.com or https://gateway.com/rc
  let local_dest =  config.sub_domain_mode ? host.split(config.external_domain).filter((e)=>e!="")[0]:req.url.split('/')[1]
  local_dest = local_dest && local_dest.replace(".","");
  req.url =  config.sub_domain_mode ? req.url : req.url.replace(`/${local_dest}`,"")

  if(public_domain && config.services[local_dest]) {
    var result = {forward_address: config.services[local_dest].local_address}
    result.type = config.services[local_dest].translate_local_addresses? TYPES.FORWARD_W_T:TYPES.FORWARD
    return result;
  }

  if(public_domain && local_dest){
    return {type:TYPES.FORWARD, forward_address:decode(local_dest)}
  }
  return {type:TYPES.UNKNOWN_REQUEST}
}

module.exports.config = config;
module.exports.getRequestType = getRequestType;
module.exports.REQ_TYPES = TYPES;
module.exports.transformURI = transformURI
