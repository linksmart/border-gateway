const bcrypt = require('bcrypt');
const mqtt_match = require('mqtt-match')
const {AAA, CAT} = require('./log')
module.exports = async(req,profile,key) =>  {


  if(!profile || !profile.password ||  isNaN(profile.valid_from || NaN) || isNaN(profile.valid_to || NaN)  || !profile.rules ){
    AAA.log(CAT.PROFILE,"DENIED",key.user_id,"User profile has been removed or corrupted");
    return {status:false,error:'User profile has been removed or corrupted'}
  }
  if(profile.suspended){
    AAA.log(CAT.SUSPENDED,"DENIED",key.user_id,"API key belongs to suspended account");
    return {status:false,error:'Supplied api key has been suspended, Please ask the BGW Admin to activiate your key'}
  }
  const now = Date.now()
  if(!(profile.valid_from < profile.valid_to &&  now > profile.valid_from && now < profile.valid_to)){
    AAA.log(CAT.EXPIRED,"DENIED",key.user_id,"bgw api key is expired or not valid yet");
    return {status:false,error:"bgw api key is expired or not valid yet"}
  }
  const correctPassord = await bcrypt.compare(key.password, profile.password)
  if(!correctPassord){
    AAA.log(CAT.PASSWORD,"DENIED",key.user_id,"Wong password, API key has been revoked/renewd");
    return {status:false,error:'Supplied api key has been re-issued and is no longer valid'}
  }

  req = `${req.protocol}/${req.method}/${req.host}/${req.port}/${req.path}`
  let result = profile.rules.find((rule)=>mqtt_match(rule,req))
  if (profile.rules_policy_deny){
    result = !result
  }
  if (result) {
    AAA.log(CAT.RULE_ALLOW,"ALLOWED",profile.user_id,req);
    return {status:true}
  } else {
    AAA.log(CAT.RULE_DENY,"DENIED",profile.user_id,req);
    return {status:false,error:'Supplied api key has no rule matching the requested resource'}
  }

}
