const fetch = require('node-fetch')
const config = require('./config')
module.exports  = async(req,forward_address)=>{

    let client_key = false;
    if (req.headers && req.headers.authorization) {
      var parts = req.headers.authorization.split(' ');
      parts.length === 2 && parts[0] === 'Bearer' && (client_key = parts[1])
      parts.length === 2 && parts[0] === 'Basic'  && (client_key =  new Buffer(parts[1], 'base64').toString('ascii').split(':'))
      console.log('key',client_key);
    } else if (req.query.bgw_token) {
      client_key = req.query.bgw_token;
    }
    if(!client_key) {
      return false
    }
    if (config.override_authorization_header){
      req.headers.authorization = config.override_authorization_header
    }
    const url = `http://${config.auth_server}/user/${client_key}/validate?admin_key=${config.bgw_admin_key}`

    let host = forward_address.replace(/https?:\/\//,'').split(':')
    let port = host[1] || (forward_address.startsWith('https')?443:80)
    host = host[0]
    const payload = {
      protocol:"HTTP",
      host:host,
      port:port,
      method:req.method,
      path:req.url
    }

    const options = {
      method:"POST",
      body:JSON.stringify(payload),
    	headers: {'Content-Type': 'application/json' }
    }
    try {
      let result = await fetch(url,options)
      const result_json = await result.json();
      return result_json.status
    } catch (e) {
      console.log('error occoured in getting and parsing from auth server',e);
      return false
    }

}
