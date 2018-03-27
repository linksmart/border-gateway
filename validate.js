const {connack,suback,puback,pubrec} = require('./packet_template')
const {mqttAuth, AAA, CAT} = require('../iot-bgw-aaa-client')

debug('before packet validation',packet.cmd)
module.exports = async (port, packet, key)=> {
  let result = true
  switch(  packet.cmd ){
      case 'connect':
    	  debug('case connect',packet.cmd)
    	  const canCON =  await mqttAuth(port,key,'CON')
        const hasWill = packet.will && packet.will.topic
        const canPUB = !hasWill || (hasWill &&  await mqttAuth(port,key,'PUB', packet.will.topic))
        result = canCON && canPUB
        return {
          status : result,
          packet: result?packet:connack()
        }
      case "subscribe":
    	  debug('case subscribe',packet.cmd)
        result = await packet.subscriptions.reduce(async(t,item)=>t&&(await mqttAuth(port,key,'SUB',item.topic)),true)
        return {
          status : result,
          packet: result?packet:suback(packet.messageId,new Array(packet.subscriptions.length).fill(128))
        }
      case 'publish':
    	  debug('case publish',packet.cmd)
        result = await mqttAuth(port,key,'PUB',packet.topic)
        const resPublish = {"0":null,"1":puback(packet.messageId),"2":pubrec(packet.messageId)}
        return {
          status : result,
          packet: result?packet:resPublish[packet.qos]
        }
      default:
    	  debug('case default',packet.cmd)
        return { status:result,packet:packet}
  }

}
