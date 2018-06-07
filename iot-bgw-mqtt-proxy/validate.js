const {connack, suback, puback, pubrec} = require('./packet_template');
const {mqttAuth, AAA, CAT, isDebugOn, debug} = require('../iot-bgw-aaa-client');

//AAA.log(CAT.DEBUG, `Before packet validation`);

module.exports = async (port, packet, key) => {

    //debug('validate.js, port =', port);
    //debug('validate.js, packet =', packet);
    //debug('validate.js, key =', key);

    let result = true;
    switch (packet.cmd) {
        case 'connect':
            //AAA.log(CAT.DEBUG, `case connect`);
            const canCON = await mqttAuth(port, key, 'CON');
            const hasWill = packet.will && packet.will.topic;
            const canPUB = !hasWill || (hasWill && await mqttAuth(port, key, 'PUB', packet.will.topic));
            result = canCON && canPUB;
            return {
                status: result,
                packet: result ? packet : connack()
            };
        case "subscribe":
            //AAA.log(CAT.DEBUG, `case subscribe`);
            result = await packet.subscriptions.reduce(async(t, item) => t && (await mqttAuth(port, key, 'SUB', item.topic)), true);
            return {
                status: result,
                packet: result ? packet : suback(packet.messageId, new Array(packet.subscriptions.length).fill(128))
            };
        case 'publish':
            //AAA.log(CAT.DEBUG, `case publish`);
            result = await mqttAuth(port, key, 'PUB', packet.topic);
            const resPublish = {"0": null, "1": puback(packet.messageId), "2": pubrec(packet.messageId)};
            return {
                status: result,
                packet: result ? packet : resPublish[packet.qos]
            };
        default:
            //AAA.log(CAT.DEBUG, `case default`);
            return {status: result, packet: packet};
    }

};
