
const {AAA, CAT} = require('../bgw-aaa-client');
const mqtt_match = require('mqtt-match');

module.exports = (profile, path, source) => {
    let result = profile.rules.find((rule) => mqtt_match(rule, path));
    if (result) {
        AAA.log(CAT.RULE_ALLOW,'auth-service', "ALLOWED", profile.user_id, path, source);
        return {status: true};
    } else {
        AAA.log(CAT.RULE_DENY,'auth-service', "DENIED", profile.user_id, path, source);
        return {status: false, error: 'Forbidden'};
    }
};