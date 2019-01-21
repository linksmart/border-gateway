const config = require('./config');
const {AAA, CAT} = require('../bgw-aaa-client');
const app = require('express')();
const {requestAuth} = require('./request_auth');
const bodyParser = require('body-parser');

app.use(bodyParser.json());

app.post('/auth/bgw',async (req, res) => {

    AAA.log(CAT.DEBUG, 'body',req.body);
        if (req.body && req.body.rule && (typeof req.body.rule === 'string')) {
            const result = await requestAuth(req);

            if (result.status) {

                res.status(200).json({isAllowed: true, openidConnectProviderName: result.openidConnectProviderName});
            }
            else {

                res.status(200).json({isAllowed: false, openidConnectProviderName: result.openidConnectProviderName, error: result.error});
            }
            return;
        }
        res.status(400).json({isAllowed: false, error: "no rule string given"});
    }
);

app.post('/auth',async (req, res) => {

        AAA.log(CAT.DEBUG, 'body',req.body);
        if (req.body && req.body.rule && (typeof req.body.rule === 'string')) {
            const result = await requestAuth(req);

            if (result.status) {

                res.status(200).json({isAllowed: true, openidConnectProviderName: result.openidConnectProviderName});
            }
            else {

                res.status(200).json({isAllowed: false, openidConnectProviderName: result.openidConnectProviderName, error: result.error});
            }
            return;
        }
        res.status(400).json({isAllowed: false, error: "no rule string given"});
    }
);

app.listen(config.bind_port, () =>
    AAA.log(CAT.PROCESS_START, `auth-service listening on port ${config.bind_port}`));


