const config = require('./config');
const logger = require('../logger/log')(config.serviceName, config.logLevel);
const tracer = require('../tracer/trace').jaegerTrace(config.serviceName, config.enableDistributedTracing);
const axios = require('axios');
const opentracing = require('opentracing');
const {connack, suback, puback, pubrec} = require('./packet_template');

const mqttAuth = async (port, credentials, method, path = '', ctx) => {

    let childSpan = tracer.startSpan('mqttAuth', {childOf: ctx});
    childSpan.setTag("function", "mqttAuth");
    const payload = `MQTT/${method}/${config.broker.address}/${config.broker.port}/${path}`;
    childSpan.setTag("payload", payload);

    if (config.no_auth) {

        childSpan.setTag("no_auth", "true");
        childSpan.finish();
        return true
    }

    let authorization;
    if (credentials.password && credentials.password !== '') {
        authorization = 'Basic ' + Buffer.from(credentials.username + ':' + credentials.password).toString('base64');
    } else {
        if (credentials.username && credentials.username !== '') {
            authorization = 'Bearer ' + credentials.username;
        }
    }

    let response;
    try {
        const openId = axios.create();

        let headers = {authorization: authorization || ""};

        let headersCarrier = {};
        tracer.inject(childSpan, opentracing.FORMAT_HTTP_HEADERS, headersCarrier);
        const headersCarrierKeys = Object.keys(headersCarrier);
        for (const key of headersCarrierKeys) {
            headers[key] = headersCarrier[key];
        }

        response = await openId.request({
            method: 'post',
            headers: headers,
            url: config.auth_service + "/authorize",
            data: {
                rule: payload,
                openidConnectProviderName: config.openidConnectProviderName || 'default'
            }
        });
    } catch (error) {
        logger.log('error', 'Error in auth-service', {errorName: error.name, errorMessage: error.message});
        childSpan.log({event: "error", message: 'Error in auth-service'});
        childSpan.finish();
        return false
    }

    childSpan.finish();
    return response.data.isAuthorized;
};

module.exports = {
    validate: async function (port, packet, key, ctx) {
        {
            let childSpan = tracer.startSpan('validate', {childOf: ctx});
            childSpan.setTag("function", "validate");
            childSpan.setTag("packet.cmd", packet.cmd);
            childSpan.setTag("packet.clientId", packet.clientId);
            childSpan.setTag("packet.topic", packet.topic);

            let result = true;

            switch (packet.cmd) {
                case 'connect':
                    const canCON = await mqttAuth(port, key, 'CON', '', childSpan.context());
                    const hasWill = packet.will && packet.will.topic;
                    const canPUB = !hasWill || (hasWill && await mqttAuth(port, key, 'PUB', packet.will.topic, childSpan.context()));
                    result = canCON && canPUB;
                    childSpan.finish();
                    return {
                        status: result,
                        packet: result ? packet : connack()
                    };
                case 'subscribe':
                    result = await packet.subscriptions.reduce(async (t, item) => t && (await mqttAuth(port, key, 'SUB', item.topic, childSpan.context())), true);
                    childSpan.finish();
                    return {
                        status: result,
                        packet: result ? packet : suback(packet.messageId, new Array(packet.subscriptions.length).fill(128))
                    };
                case 'publish':
                    result = await mqttAuth(port, key, 'PUB', packet.topic, childSpan.context());
                    const resPublish = {"0": null, "1": puback(packet.messageId), "2": pubrec(packet.messageId)};
                    childSpan.finish();
                    return {
                        status: result,
                        packet: result ? packet : resPublish[packet.qos]
                    };
                default:
                    childSpan.finish();
                    return {status: result, packet: packet};
            }
        }
    },
    mqttAuth: mqttAuth
};


