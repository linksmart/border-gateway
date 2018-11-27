const config = require("./config");
const validate = require("./validate");
const decode64 = (b64) => new Buffer(b64, 'base64').toString('ascii');

const requestAuth = async (req) => {


    let openid_connect_provider = config.openid_connect_providers[req.body.openid_connect_provider_name] || config.openid_connect_providers['default'];
    let auth_type = 'password';
    let username = openid_connect_provider.anonymous_user;
    let password = openid_connect_provider.anonymous_user;

    if (req.headers && req.headers.authorization) {
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

    return await validate(req.body.input, openid_connect_provider, `[source:${req.connection.remoteAddress}:${req.connection.remotePort}]`, username, password, auth_type);
};

module.exports = {requestAuth};
