const chalk = require('chalk');
const config = require('./config_mgr')();

let process_color = {
  http:chalk.bgCyan,
  mqtt: chalk.bgBlue,
  external:chalk.bgGreen,
  auth:chalk.bgMagenta
}
process_color = process_color[config.aaa_client.name.split('-')[0]]
let cat_color = {
  "W":chalk.yellow,
  "F":chalk.red,
  "E":chalk.red
}
const logNoColor = (...arg)=> console.log(config.aaa_client.name,"AAA", ...arg);
const logColor =  (cat, ...arg)=> console.log(process_color(config.aaa_client.name,"AAA"), cat_color[cat[0]]?cat_color[cat[0]](cat, ...arg):chalk.reset(cat,...arg));
const log = config.aaa_client.no_color ? logNoColor:logColor

const CAT = {
  PROCESS_START: "I PROCESS_START",
  BUG: "F BUG",
  RULE_ALLOW:'I RULE_ALLOW',
  CON_TERMINATE:'W CON_TERMINATE',
  CON_START:'I CON_START',
  CON_END:'I CON_END',
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
