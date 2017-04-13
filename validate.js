const bcrypt = require('bcrypt');
const mqtt_match = require('mqtt-match')
module.exports = async(req,profile,key) =>  {


  if(profile.suspended){
    return {status:false,error:'Supplied api key has been suspended, Please ask the BGW Admin to activiate your key'}
  }

  const correctPassord = await bcrypt.compare(key.password, profile.password)
  if(!correctPassord){
    return {status:false,error:'Supplied api key has been re-issued and is no longer valid'}
  }



  req = `${req.protocol}/${req.method}/${req.host}/${req.port}/${req.path}`
  const result = !!profile.rules.find((rule)=>mqtt_match(rule,req))
  if (result) {
    return {status:true}
  } else {
    return {status:false,error:'Supplied api key has no autherization to access the requested resource'}
  }

}
