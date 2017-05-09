const fetch = require('node-fetch')
const bcrypt = require('bcrypt');
const mqtt_match = require('mqtt-match')
const config = require('./config_mgr')();
const cache = require ('./cache')
const { verify } = require('./key')
const {AAA, CAT} = require('./log')

const anonymousKey = {valid:true,user_id:"anonymous",key:"anonymous",password:"anonymous"}

module.exports = async(path, client_key,port)=> {
  let isAnonymous = false
  if(!client_key) {
    AAA.log(CAT.MISSING_KEY,"API key was not supplied, setting user id to anonymous",path,port);
    client_key = "anonymous"
    isAnonymous = true
  }

  const cached = cache.get(client_key)
  if (cached) {
    if(cached.passed){
      return matchRules(cached.profile,path,port,true)
    } else {
      AAA.log(cached.aaa_message,path,port,'[cached profile]');
      return cached.return_object
    }
  }

  let profile = false
  const key  = isAnonymous?anonymousKey:verify(client_key)
  if(!key.valid){
    const res = {status:false, error:`Supplied BGW API key was not issued by the autherized Border Gateway ${config.external_domain}` }
    cache.set(key,res,path,port,false,CAT.INVALID_KEY,"DENIED",key.error?key.error:key.user_id,"API key faild signature matching");
    return  res
  }


  const options = {  headers: {
      'Content-Type': 'application/json',
      'Authorization': config.aaa_client.secret
  } }
  try {
    let result = await fetch(`${config.aaa_client.host}/user/${key.user_id}`,options)
    profile = await result.json();

  } catch (e) {
     AAA.log(CAT.WRONG_AUTH_SERVER_RES,"DENIED",key.user_id,"This could be due to auth server being offline or failing",path,port);
    return {status:false, error:`Error in contacting the Border Gateway Auth server, ensure the auth server is running and your bgw configration is correct` }
  }

  if(!profile || !profile.password ||  isNaN(profile.valid_from || NaN) || isNaN(profile.valid_to || NaN)  || !Array.isArray(profile.rules)){
    const res = {status:false,error:'Supplied BGW API key associated with a user profile that has been removed or corrupted'}
    cache.set(key,res,path,port,false,CAT.PROFILE,"DENIED",key.user_id,"User profile has been removed or corrupted");
    return res
  }
  if(profile.suspended){
    const res = {status:false,error:"Supplied BGW API key for user id 'anonymous' has been suspended, Please ask the BGW Admin to activiate your key"}
    cache.set(key,res,path,port,false,CAT.SUSPENDED,"DENIED",key.user_id,"API key belongs to suspended account");
    return res
  }
  const now = Date.now()
  if(!(profile.valid_from < profile.valid_to &&  now > profile.valid_from && now < profile.valid_to)){
    const res = {status:false,error:"Supplied BGW API key is expired or not valid yet"}
    cache.set(key,res,path,port,false,CAT.EXPIRED,"DENIED",key.user_id,"bgw api key is expired or not valid yet");
    return res
  }
  const correctPassord = isAnonymous?true:(await bcrypt.compare(key.password, profile.password))
  if(!correctPassord){
    const res = {status:false,error:'Supplied BGW API key has been re-issued and is no longer valid'}
    cache.set(key,res,path,port,false,CAT.PASSWORD,"DENIED",key.user_id,"Wong password, API key has been revoked/renewd");
    return res
  }
  cache.set(key,false,path,port,profile);

  return matchRules(profile,path,port)

}

const matchRules = (profile,path,port,cached) => {
  let result = profile.rules.find((rule)=>mqtt_match(rule,path))
  if (profile.rules_policy_deny_match){
    result = !result
  }
  if (result) {
    AAA.log(CAT.RULE_ALLOW,"ALLOWED",profile.user_id,path,port,(cached?'[cached profile]':''));
    return {status:true}
  } else {
    AAA.log(CAT.RULE_DENY,"DENIED",profile.user_id,path,port,(cached?'[cached profile]':''));
    return {status:false,error:'Supplied api key has no rule matching the requested resource'}
  }
}
