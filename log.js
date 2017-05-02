const chalk = require('chalk');
const config = require('./config_mgr')();
let process_color = {
  http:chalk.bgCyan,
  mqtt: chalk.bgBlue,
  external:chalk.bgGreen,
  auth:chalk.bgMagenta
}
process_color = process_color[config.aaa_client.name.split('-')[0]]
process_color = process_color ? process_color : chalk.reset
let cat_color = {
  "W":chalk.yellow,
  "F":chalk.red,
  "E":chalk.red
}
const timestamp = ()=> `[${new Date().toLocaleString()}]`

const logFunction = {
  log :(...arg)=> console.log(config.aaa_client.name,"AAA", ...arg),
  logTS :(...arg)=> console.log(timestamp(),config.aaa_client.name,"AAA", ...arg),
  logColor : (cat, ...arg)=> console.log(process_color(config.aaa_client.name,"AAA"), cat_color[cat[0]]?cat_color[cat[0]](cat, ...arg):chalk.reset(cat,...arg)),
  logColorTS : (cat, ...arg)=> console.log(process_color(timestamp(),config.aaa_client.name,"AAA"), cat_color[cat[0]]?cat_color[cat[0]](cat, ...arg):chalk.reset(cat,...arg))
}
const isTS = config.aaa_client.timestamp ? "TS":""
const isColor = config.aaa_client.no_color ? "" : "Color"
const log = logFunction[`log${isColor}${isTS}`]

const CAT = {
  PROCESS_START: "I PROCESS_START",
  PROCESS_END: "I PROCESS_END",
  BUG: "F BUG",
  DEBUG: "D DEBUG",
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
process.on('SIGINT', () => {
  log(CAT.PROCESS_END, `Shutting down the bgw`);
  process.exit();
});
module.exports = {log,CAT}
module.exports.AAA = module.exports
module.exports.CAT = CAT
