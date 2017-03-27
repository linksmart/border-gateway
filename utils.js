var config = require('./config.json')
const ip = require('ip');

const TYPES = {
  FORWARD: 'FORWARD',
  FORWARD_W_T: 'FORWARD_W_T',
  UNKNOWN_REQUEST: 'UNKNOWN_REQUEST'
}

const encode = (host)=> {
  host = host.split(":");

  return (ip.toLong(host[0])).toString(36)+"-"+Number(host[1]).toString(36)
}
const decode = (host)=> {
  host = host.split("-");
  const address = ip.fromLong(parseInt(host[0],36))+":"+parseInt(host[1],36);
  return {address:"http://"+address, is_web:host[2] }
}


const  transformURI = (data, req, res)=> (data+"").replace(/(https?|tcp):\/\/([\-\:\_\.\w\d]*)/g,(e,i,j)=>{

  return (i.includes('http')? "https://":i+"://")+encode(j)+"."+config.external_domain+((i.includes('http') && config.external_port==443)?"":":"+config.external_port)})

const getRequestType = (req) => {
  const host =  req.headers.host
  let local_dest =  host.split(config.external_domain).filter((e)=>e!="")[0].replace('.','')

  if( config.services[local_dest]) {
    var result = {forward_address: config.services[local_dest].local_address}
    result.type = config.services[local_dest].translate_local_addresses? TYPES.FORWARD_W_T:TYPES.FORWARD
    return result;
  }

  if(local_dest){
    return {type:TYPES.FORWARD, forward_address:decode(local_dest).address}
  }
  return {type:TYPES.UNKNOWN_REQUEST}
}

module.exports.config = config;
module.exports.getRequestType = getRequestType;
module.exports.REQ_TYPES = TYPES;
module.exports.transformURI = transformURI
