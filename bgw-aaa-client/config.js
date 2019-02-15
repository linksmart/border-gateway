const toml = require('toml');
const fs = require('fs');

let config = {
    name: "aaa-client",
    log_level: "debug",
    no_timestamp: false
};

let configFromFile = toml.parse(fs.readFileSync('./config/config.toml'));

if(configFromFile["aaa-client"]) {
    Object.assign(config, configFromFile["aaa-client"]);
}
module.exports = config;
