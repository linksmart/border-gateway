const config = require('./config_mgr')();

const CAT = {
    PROCESS_START: "I PROCESS_START",
    PROCESS_END: "I PROCESS_END",
    BUG: "F BUG",
    DEBUG: "D DEBUG",
    RULE_ALLOW: 'I RULE_ALLOW',
    CON_TERMINATE: 'W CON_TERMINATE',
    CON_START: 'I CON_START',
    CON_END: 'I CON_END',
    RULE_DENY: 'W RULE_DENY',
    PROFILE: 'W PROFILE',
    PASSWORD: 'W PASSWORD',
    SUSPENDED: 'W SUSPENDED',
    EXPIRED: 'W EXPIRED',
    INVALID_USER_CREDENTIALS: 'W INVALID_USER_CREDENTIALS',
    INVALID_KEY: "W INVALID_KEY",
    MISSING_KEY: "W MISSING_KEY",
    WRONG_AUTH_SERVER_RES: "E WRONG_AUTH_SERVER_RES",
    INVALID_ACCESS_TOKEN: "W INVALID_ACCESS_TOKEN"
};
const log_levels = {"A": 0, "D": 1, "I": 2, "W": 3, "E": 4, "F": 5, "O": 6};
const ps_log_level = log_levels[config.aaa_client.log_level[0].toUpperCase()] - 1;
const can_log = (cat) => log_levels[cat[0]] > ps_log_level;
const timestamp = () => `[${new Date().toLocaleString()}]`;

const logFunction = {
    log: (cat, ...arg) => can_log(cat) && console.log(config.aaa_client.name, "AAA", cat, ...arg),
    logTS: (cat, ...arg) => can_log(cat) && console.log(timestamp(), config.aaa_client.name, "AAA", cat, ...arg)//,
};

const isTS = (!config.aaa_client.no_timestamp) ? "TS" : "";
const log = logFunction[`log${isTS}`];
const debug = (...arg) => log(CAT.DEBUG, ...arg);
const isDebugOn = can_log("D");

process.on('unhandledRejection', (err) => {
    log(CAT.BUG, err.stack);
    process.exit(1);
});
process.on('uncaughtException', (err) => {
    log(CAT.BUG, err.stack);
    process.exit(1);
});

const endProcess = (sig) => process.on(sig, () => {
    log(CAT.PROCESS_END, `Shutting down the bgw with ${sig}`);
    process.exit();
});
endProcess('SIGINT');
endProcess('SIGTERM');


let configCopy = Object.assign({}, config);
configCopy.aaa_client = Object.assign({}, config.aaa_client);
configCopy.aaa_client.secret = "[redacted]";
setTimeout(() => debug('configs', JSON.stringify(configCopy, null, 4)), 1000);


module.exports = {log, CAT, debug, isDebugOn};
module.exports.AAA = module.exports;
