const fetch = require('node-fetch')
const validate = require('./validate')
const { verify } = require('./key')
const config = require('./config_mgr')();

module.exports = async(payload, client_key)=> {

  const key  = verify(client_key)
  if(!key.valid){
    return {status:false, error:`This key was not issued by the autherized Border Gateway ${config.external_domain}` }
  }

  const url = `http://${config.auth_server}/user/${key.user_id}`

  const options = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': config.bgw_admin_key_string
    }
  }
  let profile = false
  try {
    let result = await fetch(url,options)
    profile = await result.json();

  } catch (e) {
    return {status:false, error:`Error in contacting the Border Gateway Auth server, ensure the auth server is running and your bgw configration is correct` }
  }

  return validate(payload,profile,key)

}
