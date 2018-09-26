
const {AAA, CAT} = require('./log');
const mqtt_match = require('mqtt-match');

module.exports = (profile, path, port) => {
    let result = profile.rules.find((rule) => mqtt_match(rule, path));
    if (result) {
        AAA.log(CAT.RULE_ALLOW, "ALLOWED", profile.user_id, path, port);
        return {status: true};
    } else {
        AAA.log(CAT.RULE_DENY, "DENIED", profile.user_id, path, port);
        return {status: false, error: 'Supplied api key has no rule matching the requested resource'};
    }
};