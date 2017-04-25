const {connack,suback,puback,pubrec} = require('./packet_template')
const {mqttAuth, log} = require('../iot-bgw-auth-client')

module.exports = async (packet, key)=> {
  let result = true
  switch(  packet.cmd ){
      case 'connect':
        result = await mqttAuth(key,'connect')
        return {
          status : result,
          packet: result?packet:connack()
        }
      case "subscribe":
        result = await packet.subscriptions.reduce(async(t,item)=>t&&(await mqttAuth(key,'subscribe',item.topic)),true)
        return {
          status : result,
          packet: result?packet:suback(packet.messageId,new Array(packet.subscriptions.length).fill(128))
        }
      case 'publish':
        result = await mqttAuth(key,'publish',packet.topic)
        const resPublish = {"0":null,"1":puback(packet.messageId),"2":pubrec(packet.messageId)}
        return {
          status : result,
          packet: result?packet:resPublish[packet.qos]
        }
      default:
        return { status:result,packet:packet}
  }

}
