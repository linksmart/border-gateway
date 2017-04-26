const fetch = require('node-fetch')
const validate = require('./validate')
const { verify } = require('./key')
const config = require('./config_mgr')();
const {AAA, CAT} = require('./log')


module.exports = async(load, client_key)=> {
  if(!client_key) {
    AAA.log(CAT.MISSING_KEY,"DENIED","API key was not supplied",`${load.protocol}/${load.method}/${load.host}/${load.port}/${load.path}`);
    return {status:false,error:'Border Gateway API key is not supplied '}
  }

  const key  = verify(client_key)
  if(!key.valid){
    AAA.log(CAT.INVALID_KEY,"DENIED",key.error?key.error:key.user_id,"API key faild signature matching");
    return {status:false, error:`This key was not issued by the autherized Border Gateway ${config.external_domain}` }
  }

  const url = `${config.auth_server}/user/${key.user_id}`

  const options = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': config.bgw_admin_key
    }
  }
  let profile = false
  try {
    let result = await fetch(url,options)
    profile = await result.json();

  } catch (e) {
    AAA.log(CAT.WRONG_AUTH_SERVER_RES,"DENIED",key.user_id,"This could be due to auth server being offline or failing");
    return {status:false, error:`Error in contacting the Border Gateway Auth server, ensure the auth server is running and your bgw configration is correct` }
  }

  return validate(load,profile,key)

}
