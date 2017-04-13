
const config = require('./config_mgr')();
const request = require('./request')



module.exports = (req)=>{
    let client_key = false;
    if (req.headers && req.headers.authorization) {
      var parts = req.headers.authorization.split(' ');
      parts.length === 2 &&
       (parts[0] === 'Bearer' && (client_key = parts[1])) ||
       (parts[0] === 'Basic'  && (client_key = new Buffer(parts[1], 'base64').toString('ascii').split(':')[0]))
    } else if (req.query.bgw_key) {
      client_key = req.query.bgw_key;
    }


    if(!client_key) {
      return {status:false,error:'Border Gateway API key is not supplied '}
    }
    if (config.override_authorization_header){
      req.headers.authorization = config.override_authorization_header
    }

    let host = req.bgw.forward_address.replace(/https?:\/\//,'').split(':')
    let port = host[1] || (req.bgw.forward_address.startsWith('https')?443:80)
    host = host[0]
    const payload = {
      protocol:"HTTP",
      host:host,
      port:port,
      method:req.method,
      path:req.url
    }
   return request(payload,client_key)

}
