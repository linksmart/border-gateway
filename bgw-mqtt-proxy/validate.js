const {connack, suback, puback, pubrec} = require('./packet_template');
const {mqttAuth, AAA, CAT, isDebugOn, debug} = require('../bgw-aaa-client');

module.exports = (port, packet, key) => {

    let result = true;
    switch (packet.cmd) {
        case 'connect':
            const canCON = mqttAuth(port, key, 'CON');
            const hasWill = packet.will && packet.will.topic;
            const canPUB = !hasWill || (hasWill && mqttAuth(port, key, 'PUB', packet.will.topic));
            result = canCON && canPUB;
            return {
                status: result,
                packet: result ? packet : connack()
            };
        case "subscribe":
            result = packet.subscriptions.reduce((t, item) => t && (mqttAuth(port, key, 'SUB', item.topic)), true);
            return {
                status: result,
                packet: result ? packet : suback(packet.messageId, new Array(packet.subscriptions.length).fill(128))
            };
        case 'publish':
            result = mqttAuth(port, key, 'PUB', packet.topic);
            const resPublish = {"0": null, "1": puback(packet.messageId), "2": pubrec(packet.messageId)};
            return {
                status: result,
                packet: result ? packet : resPublish[packet.qos]
            };
        default:
            return {status: result, packet: packet};
    }

};
