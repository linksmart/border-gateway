const config = require("./config");
const validate = require("./validate");
const decode64 = (b64) => new Buffer(b64, 'base64').toString('ascii');

const requestAuth = async (req) => {

    let override_conf = {};

    if (req.bgw.alias && req.bgw.alias.override_aaa_client_config) {
        override_conf = req.bgw.alias.override_aaa_client_config
    }

    let auth_type = override_conf.openid_authentication_type || config.aaa_client.openid_authentication_type || 'password';

    let username = "anonymous";
    let password = "anonymous";

    if (!(auth_type === 'none') && req.headers && req.headers.authorization) {
        let parts = req.headers.authorization.split(' ');
        if (parts.length === 2) {
            if ((parts[0] === 'Bearer' || parts[0] === 'bearer') && (username = parts[1])) {
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

    override_conf.openid_authentication_type = auth_type;
    return await validate(req.body.input, `[source:${req.connection.remoteAddress}:${req.connection.remotePort}]`, username, password, override_conf);
};


module.exports = {requestAuth};
