const fetch = require('node-fetch');
const qs = require("querystring");
const matchRules = require('./rules');
const config = require('./config_mgr')();
const jwt = require('jsonwebtoken');
var getPem = require('rsa-pem-from-mod-exp');

const {AAA, CAT, isDebugOn, debug} = require('./log');

let parse_credentials = {
    password: (username, password) => ({username, password}),
    refresh_token: (refresh_token) => ({refresh_token}),
    access_token: (access_token) => ({access_token}),
    authorization_code: (code) => ({code, redirect_uri: config.aaa_client.host})
};

const anonymous_user = config.aaa_client.openid_anonymous_user;
const anonymous_pass = config.aaa_client.openid_anonymous_pass;
const config_grant = config.aaa_client.openid_grant_type;
const realm_public_key_modulus = config.aaa_client.openid_realm_public_key_modulus;
const realm_public_key_exponent = config.aaa_client.openid_realm_public_key_exponent;

module.exports = async (path, source, username = anonymous_user, password = anonymous_pass) => {
    const key = username + (password || "");
    let grant_type = username === anonymous_user ? 'password' : config_grant;
    let req_credentials = parse_credentials[grant_type](username, password);

    let profile = {};
    if (grant_type === 'access_token') {

        let pem = getPem(realm_public_key_modulus, realm_public_key_exponent);

        jwt.verify(req_credentials.access_token, pem, {
            audience: config.aaa_client.openid_clientid,
            issuer: config.aaa_client.host,
            ignoreExpiration: false
        }, function (err, decoded) {

            if (err) {
                AAA.log(CAT.INVALID_ACCESS_TOKEN, "Access token is invalid", err.name, err.message);
                return {
                    status: false,
                    error: "Access token is invalid, error = " + err.name
                };
            }

            profile.at_body = decoded;
        });
    }

    else { // code before introducing access token functionality

        const options = {
            method: "POST",
            headers: {'content-type': 'application/x-www-form-urlencoded'},
            body: {
                'grant_type': grant_type,
                'client_id': config.aaa_client.openid_clientid,
                'client_secret': config.aaa_client.openid_clientsecret
            }
        };
        Object.assign(options.body, req_credentials);
        options.body = qs.stringify(options.body);

        try {

            let result = await fetch(`${config.aaa_client.host}/protocol/openid-connect/token`, options); // see https://www.keycloak.org/docs/3.0/securing_apps/topics/oidc/oidc-generic.html
            profile = await result.json();
            isDebugOn && debug('open id server result ', JSON.stringify(profile));
        } catch (e) {
            AAA.log(CAT.WRONG_AUTH_SERVER_RES, "DENIED This could be due to auth server being offline or failing", path, source);
            return {
                status: false,
                error: `Error in contacting the openid provider, ensure the openid provider is running and your bgw aaa_client host is correct`
            };
        }

        if (!profile || !profile.access_token || !profile.refresh_token) {
            const res = {status: false, error: 'Incorrect tokens from open id provider, double check your credentials'};
            return res;
        }

        profile.at_body = JSON.parse(new Buffer(profile.access_token.split(".")[1], 'base64').toString('ascii'));
    }
    ;

    if (!profile.at_body || !profile.at_body.preferred_username || !(profile.at_body.bgw_rules || profile.at_body.group_bgw_rules)) {
        const res = {
            status: false,
            error: 'Incorrect username or bgw rules from open id provider, double check your credentials'
        };
        return res;
    }

    profile.user_id = profile.at_body.preferred_username;
    profile.rules = profile.at_body.bgw_rules ? profile.at_body.bgw_rules.split(" ") : [];
    profile.rules = profile.rules.concat(profile.at_body.group_bgw_rules ? profile.at_body.group_bgw_rules.split(" ") : []);
    return matchRules(profile, path, source);
};
