

const info = (...arg)=> console.info("AAA", ...arg);

const warn = (...arg)=> console.warn("AAA", ...arg);

const error = (...arg)=> console.error("AAA", ...arg);


const CAT = {
  PROCESS: "PROCESS",
  RULE:'RULE',
  PASSWORD: 'PASSWORD',
  SUSPENDED:'SUSPENDED',
  INVALID_KEY:"INVALID_KEY",
  MISSING_KEY:"MISSING_KEY",
  WRONG_AUTH_SERVER_RES:"WRONG_AUTH_SERVER_RES"
}

module.exports = {info,warn,error,CAT}
module.exports.log = module.exports
module.exports.CAT = CAT
