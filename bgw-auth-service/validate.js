const config = require('./config');
const fetch = require('node-fetch');
const qs = require("querystring");
const matchRules = require('./rules');
const jwt = require('jsonwebtoken');
const getPem = require('rsa-pem-from-mod-exp');
const https = require("https");

const {AAA, CAT, isDebugOn, debug} = require('../bgw-aaa-client');

//temporary workaround because of ATOS´ self-signed certificate for Keycloak
const agent = new https.Agent({
    rejectUnauthorized: false
});

let parse_credentials = {
    password: (username, password, aaa_client_host) => ({username, password}),
    access_token: (access_token, password, aaa_client_host) => ({access_token}),
};

module.exports = async (path, source, username, password, override_aaa_client_config) => {

    if (!username) {
        username = (override_aaa_client_config && override_aaa_client_config.openid_anonymous_user) || config.aaa_client.openid_anonymous_user;
    }

    if (!password) {
        password = (override_aaa_client_config && override_aaa_client_config.openid_anonymous_pass) || config.aaa_client.openid_anonymous_pass
    }

    const anonymous_user = (override_aaa_client_config && override_aaa_client_config.openid_anonymous_user) || config.aaa_client.openid_anonymous_user;
    const config_authentication_type = (override_aaa_client_config && override_aaa_client_config.openid_authentication_type) || config.aaa_client.openid_authentication_type;
    const client_id = (override_aaa_client_config && override_aaa_client_config.openid_clientid) || config.aaa_client.openid_clientid;
    const client_secret = (override_aaa_client_config && override_aaa_client_config.openid_clientsecret) || config.aaa_client.openid_clientid;
    const host = (override_aaa_client_config && override_aaa_client_config.host || config.aaa_client.host);
    const realm_public_key_modulus = (override_aaa_client_config && override_aaa_client_config.openid_realm_public_key_modulus || config.aaa_client.openid_realm_public_key_modulus);
    const realm_public_key_exponent = (override_aaa_client_config && override_aaa_client_config.openid_realm_public_key_exponent || config.aaa_client.openid_realm_public_key_exponent);

    if (config_authentication_type === 'none') {
        return {status: true};
    }

    const key = username + (password || "");
    let authentication_type = username === anonymous_user ? 'password' : config_authentication_type;
    let req_credentials = parse_credentials[authentication_type](username, password, host);

    let profile = {};
    let pem = getPem(realm_public_key_modulus, realm_public_key_exponent);
    if (authentication_type === 'access_token') {


        jwt.verify(req_credentials.access_token, pem, {
            audience: client_id,
            issuer: host,
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
                'grant_type': authentication_type,
                'client_id': client_id,
                'client_secret': client_secret
            },
            agent: agent
        };
        Object.assign(options.body, req_credentials);
        options.body = qs.stringify(options.body);

        try {

            let result = await fetch(`${host}/protocol/openid-connect/token`, options); // see https://www.keycloak.org/docs/3.0/securing_apps/topics/oidc/oidc-generic.html
            profile = await result.json();
            //isDebugOn && debug('open id server result ', JSON.stringify(profile));
        } catch (e) {
            AAA.log(CAT.WRONG_AUTH_SERVER_RES, "DENIED This could be due to auth server being offline or failing", path, source);
            return {
                status: false,
                error: `Error in contacting the openid provider, ensure the openid provider is running and your bgw aaa_client host is correct`
            };
        }

        if (!profile || !profile.access_token) {
            let err = 'Unauthorized';
            const res = {status: false, error: err};
            AAA.log(CAT.INVALID_USER_CREDENTIALS, err, path, source);
            return res;
        }

        jwt.verify(profile.access_token, pem, {
            audience: client_id,
            issuer: host,
            ignoreExpiration: false
        }, function (err, decoded) {

            if (err) {
                AAA.log(CAT.INVALID_ACCESS_TOKEN, "Access token is invalid", err.name, err.message);
                return {
                    status: false,
                    error: "Access token is invalid, error = " + err.name
                };
            }

            AAA.log(CAT.DEBUG, "Decoded access token:\n", decoded);
        });


        profile.at_body = JSON.parse(new Buffer(profile.access_token.split(".")[1], 'base64').toString('ascii'));
    }
    if (!profile.at_body || !profile.at_body.preferred_username || !(profile.at_body.bgw_rules || profile.at_body.group_bgw_rules)) {
        let err = 'Unauthorized';
        const res = {
            status: false,
            error: err
        };
        AAA.log(CAT.INVALID_USER_CREDENTIALS, err, path, source);
        return res;
    }

    profile.user_id = profile.at_body.preferred_username;
    profile.rules = profile.at_body.bgw_rules ? profile.at_body.bgw_rules.split(" ") : [];
    profile.rules = profile.rules.concat(profile.at_body.group_bgw_rules ? profile.at_body.group_bgw_rules.split(" ") : []);
    return matchRules(profile, path, source);
};
