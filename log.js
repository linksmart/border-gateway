const chalk = require('chalk');
const config = require('./config_mgr')();

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
const log_levels = {"A":0,"D":1,"I":2,"W":3,"E":4,"F":5,"O":6}
const ps_log_level = log_levels[config.aaa_client.log_level[0].toUpperCase()] -1
const disabled_cat = {}
config.aaa_client.disable_cat.forEach((cat)=>disabled_cat[cat]=true)
const can_log = (cat)=> log_levels[cat[0]] > ps_log_level && !disabled_cat[cat.slice(2)]


let process_color = {
  http:chalk.bgCyan,
  mqtt:chalk.bgBlue,
  exte:chalk.bgGreen,
  auth:chalk.bgMagenta
}
process_color = process_color[config.aaa_client.name.slice(0,4)]
process_color = process_color ? process_color : chalk.reset
let cat_color = {
  "D":chalk.dim,
  "W":chalk.yellow,
  "F":chalk.red,
  "E":chalk.red
}
const timestamp = ()=> `[${new Date().toLocaleString()}]`

const logFunction = {
  log :(cat, ...arg)=> can_log(cat) && console.log(config.aaa_client.name,"AAA", cat, ...arg),
  logTS :(cat, ...arg)=> can_log(cat) && console.log(timestamp(),config.aaa_client.name,"AAA", cat, ...arg),
  logColor : (cat, ...arg)=> can_log(cat) && console.log(process_color(config.aaa_client.name,"AAA"), cat_color[cat[0]]?cat_color[cat[0]](cat, ...arg):chalk.reset(cat,...arg)),
  logColorTS : (cat, ...arg)=> can_log(cat) &&console.log(process_color(timestamp(),config.aaa_client.name,"AAA"), cat_color[cat[0]]?cat_color[cat[0]](cat, ...arg):chalk.reset(cat,...arg))
}
const isTS = config.aaa_client.timestamp ? "TS":""
const isColor = config.aaa_client.no_color ? "" : "Color"
const log = logFunction[`log${isColor}${isTS}`]



process.on('unhandledRejection', (err) => {
  log(CAT.BUG,err.stack);
  process.exit(1);
});
process.on('uncaughtException', (err) => {
  log(CAT.BUG,err.stack);
  process.exit(1);
});

const endProcess =(sig) => process.on(sig, () => {
  log(CAT.PROCESS_END, `Shutting down the bgw with ${sig}`);
  process.exit();
})
endProcess('SIGINT')
endProcess('SIGTERM')

const debug = (...arg)=>log(CAT.DEBUG, ...arg)
setTimeout(()=>debug('configs',JSON.stringify(config)),1000)

const isDebugOn = can_log("D")

module.exports = {log,CAT,debug,isDebugOn}
module.exports.AAA = module.exports
