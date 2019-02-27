const config = require('./config');
const logger = require('../logger/log')(config.serviceName, config.logLevel);
const mqtt_match = require('mqtt-match');

module.exports = (profile, path, source) => {
    let result = profile.rules.find((rule) => mqtt_match(rule, path));
    if (result) {
        logger.log('info', 'ALLOWED', {
            user: profile.user_id,
            path: path,
            source: source
        });
        return {status: true};
    } else {
        logger.log('info', 'DENIED', {
            user: profile.user_id,
            path: path,
            source: source
        });
        return {status: false, error: 'Forbidden'};
    }
};