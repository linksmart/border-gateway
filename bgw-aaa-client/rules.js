
const {AAA, CAT} = require('./log');
const mqtt_match = require('mqtt-match');

module.exports = (profile, path, source) => {
    let result = profile.rules.find((rule) => mqtt_match(rule, path));
    if (result) {
        AAA.log(CAT.RULE_ALLOW, "ALLOWED", profile.user_id, path, source);
        return {status: true};
    } else {
        AAA.log(CAT.RULE_DENY, "DENIED", profile.user_id, path, source);
        return {status: false, error: 'Forbidden'};
    }
};