const config = require('./config');
const logger = require('../logger/log')(config.serviceName,config.logLevel);
const app = require('express')();
const bodyParser = require('body-parser');
const validate = require("./validate");
const matchRules = require('./rules');
const decode64 = (b64) => Buffer.from(b64, 'base64').toString('utf8');

app.use(bodyParser.json());

app.post('/auth/bgw/authenticate', async (req, res) => {

    let openidConnectProviderName;

    if (req.body) {
        if (config.openid_connect_providers[req.body.openidConnectProviderName]) {
            openidConnectProviderName = req.body.openidConnectProviderName;

        } else {
            openidConnectProviderName = 'default';

        }
    }
    let openid_connect_provider = config.openid_connect_providers[openidConnectProviderName];
    let auth_type = 'password';
    let username = openid_connect_provider.anonymous_user || 'anonymous';
    let password = openid_connect_provider.anonymous_user || 'anonymous';

    if (req.headers && req.headers.authorization) {
        let headerStrings = req.headers.authorization.split(' ');
        if (headerStrings.length === 2) {
            if ((headerStrings[0] === 'Bearer' || headerStrings[0] === 'bearer') && (username = headerStrings[1])) {
                auth_type = 'access_token';
            } else if ((headerStrings[0] === 'Basic' || headerStrings[0] === 'basic') && (username = decode64(headerStrings[1]))) {
                let separatorPos = username.indexOf(":");
                password = username.substring((separatorPos+1));
                username = username.substring(0,separatorPos);
                auth_type = 'password';
            }
        }
    }

    let source = `[source:${req.connection.remoteAddress}:${req.connection.remotePort}]`;
    let authenticationResult = await validate.getProfile(openid_connect_provider, source, username, password, auth_type);
    if (authenticationResult.status) {
        res.status(200).json({
            isAuthenticated: true,
            openidConnectProviderName: openidConnectProviderName,
            rules: authenticationResult.profile.rules
        });
    } else {
        res.status(200).json({
            isAuthenticated: false,
            openidConnectProviderName: openidConnectProviderName,
            error: authenticationResult.error
        });
    }
});

app.post('/auth/bgw/authorize', async (req, res) => {
        logger.log('debug', 'POST request to authorize endpoint', {
            body: req.body
        });
        if (req.body && req.body.rule && (typeof req.body.rule === 'string')) {

            let openidConnectProviderName;

            if (config.openid_connect_providers[req.body.openidConnectProviderName]) {
                openidConnectProviderName = req.body.openidConnectProviderName;

            } else {
                openidConnectProviderName = 'default';

            }
            let openid_connect_provider = config.openid_connect_providers[openidConnectProviderName];
            let auth_type = 'password';
            let username = openid_connect_provider.anonymous_user || 'anonymous';
            let password = openid_connect_provider.anonymous_user || 'anonymous';

            if (req.headers && req.headers.authorization) {
                let headerStrings = req.headers.authorization.split(' ');
                if (headerStrings.length === 2) {
                    if ((headerStrings[0] === 'Bearer' || headerStrings[0] === 'bearer') && (username = headerStrings[1])) {
                        auth_type = 'access_token';
                    } else if ((headerStrings[0] === 'Basic' || headerStrings[0] === 'basic') && (username = decode64(headerStrings[1]))) {
                        let separatorPos = username.indexOf(":");
                        password = username.substring((separatorPos+1));
                        username = username.substring(0,separatorPos);
                        auth_type = 'password';
                    }
                }
            }

            let source = `[source:${req.connection.remoteAddress}:${req.connection.remotePort}]`;
            let authenticationResult = await validate.getProfile(openid_connect_provider, source, username, password, auth_type);

            let authorizationResult;
            if (authenticationResult.status) {
                authorizationResult = matchRules(authenticationResult.profile, req.body.rule, source);

                if (authorizationResult.status) {
                    res.status(200).json({
                        isAuthorized: true,
                        openidConnectProviderName: openidConnectProviderName
                    });
                } else {
                    res.status(200).json({
                        isAuthorized: false,
                        openidConnectProviderName: openidConnectProviderName,
                        error: authorizationResult.error
                    });
                }
            } else {
                res.status(200).json({
                    isAuthorized: false,
                    openidConnectProviderName: openidConnectProviderName,
                    error: authenticationResult.error
                });
            }
            return;
        }
        res.status(400).json({isAuthorized: false, error: "no rule string given"});
    }
);

app.listen(config.bind_port, () => {

    logger.log('info', config.serviceName+' started', {
        port: config.bind_port
    });
});