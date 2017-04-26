

const log = (...arg)=> console.log("AAA", ...arg);



const CAT = {
  PROCESS: "PROCESS",
  BUG: "F BUG",
  RULE_ALLOW:'I RULE_ALLOW',
  RULE_DENY:'W RULE_DENY',
  PROFILE: 'W PROFILE',
  PASSWORD: 'W PASSWORD',
  SUSPENDED:'W SUSPENDED',
  EXPIRED:'W EXPIRED',
  INVALID_KEY:"W INVALID_KEY",
  MISSING_KEY:"W MISSING_KEY",
  WRONG_AUTH_SERVER_RES:"E WRONG_AUTH_SERVER_RES"
}

process.on('unhandledRejection', (err) => {
  log(CAT.BUG,err.stack);
  process.exit(1);
});
process.on('uncaughtException', (err) => {
  log(CAT.BUG,err.stack);
  process.exit(1);
});
module.exports = {log,CAT}
module.exports.AAA = module.exports
module.exports.CAT = CAT
