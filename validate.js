const bcrypt = require('bcrypt');
const mqtt_match = require('mqtt-match')
const {log, CAT} = require('./log')
module.exports = async(req,profile,key) =>  {


  if(profile.suspended){
    log.info(CAT.SUSPENDED,"DENIED",profile.user_id,"API key belongs to suspended account");
    return {status:false,error:'Supplied api key has been suspended, Please ask the BGW Admin to activiate your key'}
  }

  const correctPassord = await bcrypt.compare(key.password, profile.password)
  if(!correctPassord){
    log.info(CAT.PASSWORD,"DENIED",profile.user_id,"Wong password, API key has been revoked/renewd");
    return {status:false,error:'Supplied api key has been re-issued and is no longer valid'}
  }



  req = `${req.protocol}/${req.method}/${req.host}/${req.port}/${req.path}`
  const result = profile.rules.find((rule)=>mqtt_match(rule,req))
  if (result) {
    log.info(CAT.RULE,"ALLOWED",profile.user_id,req);
    return {status:true}
  } else {
    log.info(CAT.RULE,"DENIED",profile.user_id,req);
    return {status:false,error:'Supplied api key has no rule matching the requested resource'}
  }

}
