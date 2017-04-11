const crypto = require('crypto');
const uuid = require('uuid');
const bs62 = require('base-x')('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ')

let secert =null
let auth_host="127.0.0.1"

const hash = (message)=> bs62.encode(crypto.createHmac('sha256', secert).update(message).digest())

const genId = (x=5)=>{
  const buffer = new Array(16);
  uuid.v4(null, buffer)
  return hash(bs62.encode(buffer)).slice(0,x);
}

const sign = (user_id,password=genId(12))=>{
    const message  = `${user_id}.${password}`
    return {
      password:password,
      key:`${message}.${hash(message)}`
    }
};

const verify = (tok='')=> {
  const token = tok.split('.');
  if(token.length<3)
  return {valid:false, error:'invalid token format'}
  const user_id = token.slice(0,token.length-2).join('.');
  const password= token[token.length-2];
  const signatur = token[token.length-1];
  const valid = hash(`${user_id}.${password}`) === signatur;
  return { user_id, password, signatur,valid }
};


module.exports = (_auth_host,_secert)=>{
  secert = _secert;
  auth_host = _auth_host
  return {genId,sign,verify}

}
