const crypto = require('crypto');
const bcrypt = require('bcrypt');
const uuid = require('uuid');
const bs62 = require('base-x')('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ')
const config = require('./config_mgr')()


const hmac = (message, sec = config.aaa_client.secret)=>
  bs62.encode(crypto.createHmac('sha256',sec).update(message).digest())

const genId = (x=5)=>{
  const buffer = new Array(16);
  uuid.v4(null, buffer)
  return hmac(bs62.encode(buffer)).slice(0,x);
}

const sign = async (user_id,password=genId(12))=>{
    if(user_id == 'admin' && process.env.ADMIN_KEY_PASSWORD )
    {
       password = process.env.ADMIN_KEY_PASSWORD
    }
    const message  = `${user_id}.${password}`;
    const password_hash =  await bcrypt.hash(password,10);
    return {
      password_hash: password_hash,
      key:`${message}.${hmac(message)}`
    }
};

const verify = (tok='')=> {
  const token = tok.split('.');
  if(token.length<3)
  return {valid:false, error:'invalid token format'}
  const user_id = token.slice(0,token.length-2).join('.');
  const password= token[token.length-2];
  const signatur = token[token.length-1];
  const valid = hmac(`${user_id}.${password}`) === signatur;
  return { user_id, password, signatur,valid }
};

module.exports = {
  hmac,genId,sign,verify
}
