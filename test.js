const fs = require('fs')



const key = fs.readFileSync('../cert/3/key.pem')


const TT = require('./index')('127.0.0.1',key);


const id = 'admin';

const sign = TT.sign(id)
const verify = TT.verify(sign.token)

console.log(sign.token,sign.token.length,verify.valid);
