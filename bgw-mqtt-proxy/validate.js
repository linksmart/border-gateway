const {connack, suback, puback, pubrec} = require('./packet_template');
const config = require('./config');
const axios = require('axios');
const {AAA, CAT} = require('../bgw-aaa-client');

const mqttAuth = async (port, credentials, method, path = '') => {

    if (config.no_auth) {

        return true
    }

    const payload = `MQTT/${method}/${config.broker.address}/${config.broker.port}/${path}`;

    let authorization;
    if (credentials.password && credentials.password !== '') {
        authorization = 'Basic ' + Buffer.from(credentials.username + ':' + credentials.password).toString('base64');
    }
    else {
        if (credentials.username && credentials.username !== '') {
            authorization = 'Bearer ' + credentials.username;
        }
    }

    let response;
    try {
        response = await axios({
            method: 'post',
            headers: {authorization: authorization || ""},
            url: config.auth_service+"/bgw/authorize",
            data: {
                rule: payload,
                openidConnectProviderName: config.openidConnectProviderName || 'default'
            }
        });
    }
    catch (error) {
        AAA.log(CAT.DEBUG, 'auth-service returned an error message:', error.name, error.message);
        return false
    }

    return response.data.isAuthorized;
};

module.exports = {
    validate: async function (port, packet, key) {
        {

            let result = true;

            switch (packet.cmd) {
                case 'connect':
                    const canCON = await mqttAuth(port, key, 'CON');
                    const hasWill = packet.will && packet.will.topic;
                    const canPUB = !hasWill || (hasWill && await mqttAuth(port, key, 'PUB', packet.will.topic));
                    result = canCON && canPUB;
                    return {
                        status: result,
                        packet: result ? packet : connack()
                    };
                case 'subscribe':
                    result = await packet.subscriptions.reduce(async (t, item) => t && (await mqttAuth(port, key, 'SUB', item.topic)), true);
                    return {
                        status: result,
                        packet: result ? packet : suback(packet.messageId, new Array(packet.subscriptions.length).fill(128))
                    };
                case 'publish':
                    result = await mqttAuth(port, key, 'PUB', packet.topic);
                    const resPublish = {"0": null, "1": puback(packet.messageId), "2": pubrec(packet.messageId)};
                    return {
                        status: result,
                        packet: result ? packet : resPublish[packet.qos]
                    };
                default:
                    return {status: result, packet: packet};
            }

        }
    },
    mqttAuth: mqttAuth
};


