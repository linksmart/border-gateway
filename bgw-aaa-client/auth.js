const url = require('url');
const config = require('./config_mgr')();
const validate = require("./validate");
const decode64 = (b64) => new Buffer(b64, 'base64').toString('ascii');
const {AAA, CAT, isDebugOn, debug} = require('./log');

const mqttAuth = async (port, credentials, method, path = '') => {
    const payload = `MQTT/${method}/${config.broker.address}/${config.broker.port}/${path}`;
    return (await validate(payload, `[source:${port}]`, credentials.username, credentials.password)).status;
};

const httpAuth = (req) => {
    let username = (req.bgw.alias && req.bgw.alias.username) || undefined;
    let password = (req.bgw.alias && req.bgw.alias.password) || undefined;
    let auth_type = config.aaa_client.openid_authentication_type;

    if (req.headers && req.headers.authorization) {

        if (req.bgw.alias.keep_authorization_header) {
            auth_type = 'password';
        }
        else {
            let parts = req.headers.authorization.split(' ');
            if (parts.length === 2) {
                if (!req.bgw.alias.keep_authorization_header && (parts[0] === 'Bearer' || parts[0] === 'bearer') && (username = parts[1])) {
                    parts = username.split(":");
                    password = parts[1];
                    auth_type = 'access_token';
                }

                else if (parts[0] === 'Basic' && (username = decode64(parts[1]))) {
                    parts = username.split(":");
                    username = parts[0];
                    password = parts[1];
                    auth_type = 'password';
                }
            }
        }

    }

    req.headers.authorization = (req.bgw.alias && req.bgw.alias.keep_authorization_header && req.headers.authorization) || (req.bgw.alias && req.bgw.alias.override_authorization_header)
        || config.override_authorization_header || "";

    const parse_fa = url.parse(req.bgw.forward_address);
    let host = parse_fa.hostname;
    let port = parse_fa.port || (parse_fa.protocol === 'https:' ? 443 : 80);
    const path = `${parse_fa.pathname}${url.parse(req.url).pathname}`.replace('//', '/');
    const payload = `HTTP/${req.method}/${host}/${port}${path}`;

    let override_conf = {};

    if (req.bgw.alias && req.bgw.alias.override_aaa_client_config) {
        override_conf = req.bgw.alias.override_aaa_client_config
    }

    override_conf.openid_authentication_type = auth_type;

    return validate(payload, `[source:${req.connection.remoteAddress}:${req.connection.remotePort}]`, username, password, override_conf);

};

module.exports = {mqttAuth, httpAuth};
