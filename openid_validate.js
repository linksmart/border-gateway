const fetch = require('node-fetch');
var qs = require("querystring");
const config = require('./config_mgr')();
const {AAA, CAT} = require('./log');
const matchRules = require('./rules')


module.exports = async(path, port, username=config.aaa_client.openid_anonymous_user, password=config.aaa_client.openid_anonymous_pass)=> {
 
  const options = { 
      method: "POST", 
      headers: {'content-type': 'application/x-www-form-urlencoded'}, 
      body:  qs.stringify({
        'grant_type': config.aaa_client.openid_grant_type,
        'client_id': config.aaa_client.openid_clientid,
        'client_secret':  config.aaa_client.openid_secret,
        'username': username ,
        'password': password
      })
  }
  try {
    let result = await fetch(`${config.aaa_client.host}/protocol/openid-connect/token`,options)
    profile = await result.json();
    console.log( profile )
    profile.at_body = JSON.parse(new Buffer(profile.access_token.split(".")[1], 'base64').toString('ascii'))
    console.log( profile.at_body )
  } catch (e) {
      console.log(e.stack)
    AAA.log(CAT.WRONG_AUTH_SERVER_RES,"DENIED",username,"This could be due to auth server being offline or failing",path,port);
    return {status:false, error:`Error in contacting the Border Gateway Auth server, ensure the auth server is running and your bgw configration is correct` }
  }
    if(!profile  || !profile.at_body|| !profile.at_body.preferred_username  || !(profile.at_body.bgw_rules || profile.at_body.bgw_rules) ){
    const res = {status:false,error:'Supplied BGW API credentials associated with a user profile that has been removed or corrupted'}
    //cache.set(key,res,path,port,false,CAT.PROFILE,"DENIED",key.user_id,"User profile has been removed or corrupted", profile);
    return res
  }

  let rules = profile.at_body.bgw_rules ? profile.at_body.bgw_rules.split(" ") : []
  rules = rules.concat(profile.at_body.group_bgw_rules ? profile.at_body.group_bgw_rules.split(" ") : [])

  
  return matchRules({rules:rules,user_id:profile.at_body.preferred_username},path,port)

}