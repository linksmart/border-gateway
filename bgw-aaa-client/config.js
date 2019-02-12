let config = {
    name: "aaa-client",
    log_level: "debug",
    no_timestamp: false
};

const fs = require('fs');
const configFromFile = require('../config/config.json');
Object.assign(config,configFromFile["aaa-client"]);
module.exports = config;
