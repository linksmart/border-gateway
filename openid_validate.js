const fetch = require('node-fetch');
const qs = require("querystring");
const matchRules = require('./rules');
const config = require('./config_mgr')();
const cache = require('./cache');
const {AAA, CAT, isDebugOn, debug} = require('./log');

let parse_credentials = {
    password: (username, password) => ({username, password}),
    refresh_token: (refresh_token) => ({refresh_token}),
    authorization_code: (code) => ({code, redirect_uri: config.aaa_client.host})
};

const anonymous_user = config.aaa_client.openid_anonymous_user;
const anonymous_pass = config.aaa_client.openid_anonymous_pass;
const config_grant = config.aaa_client.openid_grant_type;

module.exports = async(path, source, username = anonymous_user, password = anonymous_pass) => {
    const key = username + (password || "");
    let grant_type = username === anonymous_user ? 'password' : config_grant;
    let req_credentials = parse_credentials[grant_type](username, password);


    const cached = cache.get(key);
    if (cached) {
        if (cached.expired) {
            if (config_grant !== "password") {
                debug('Expired profile, using refresh token to retrive new tokens');
                grant_type = "refresh_token";
                req_credentials = parse_credentials[grant_type](cached.profile.refresh_token);
            }
        } else if (cached.passed) {
            return matchRules(cached.profile, path, source, true);
        } else {
            AAA.log(cached.aaa_message, path, source, '[cached profile]');
            return cached.return_object;
        }
    }

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
        return {status: false, error: `Error in contacting the openid provider, ensure the openid provider is running and your bgw aaa_client host is correct`};
    }

    if (!profile || !profile.access_token || !profile.refresh_token) {
        const res = {status: false, error: 'Incorrect tokens from open id provider, double check your credentials'};
        cache.set(key, res, path, source, false, CAT.PROFILE, "DENIED", (grant_type === 'password' ? username : grant_type), "Incorrect tokens from open id provider, check user credentials");
        return res;
    }

    profile.at_body = JSON.parse(new Buffer(profile.access_token.split(".")[1], 'base64').toString('ascii'));


    if (!profile.at_body || !profile.at_body.preferred_username || !(profile.at_body.bgw_rules || profile.at_body.group_bgw_rules)) {
        const res = {status: false, error: 'Incorrect username or bgw rules from open id provider, double check your credentials'};
        cache.set(key, res, path, source, false, CAT.PROFILE, "DENIED", (grant_type === 'password' ? username : grant_type), "User profile has been removed or corrupted, check user credentials");
        return res;
    }

    profile.cache_until = profile.at_body.exp && (Number(profile.at_body.exp) * 1000);
    profile.user_id = profile.at_body.preferred_username;
    profile.rules = profile.at_body.bgw_rules ? profile.at_body.bgw_rules.split(" ") : [];
    profile.rules = profile.rules.concat(profile.at_body.group_bgw_rules ? profile.at_body.group_bgw_rules.split(" ") : []);
    cache.set(key, false, path, source, profile);


    return matchRules(profile, path, source);

};
