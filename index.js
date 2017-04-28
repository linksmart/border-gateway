const net = require('net');
const mqtt = require('mqtt-packet')
const config = require('./config.json')
const {mqttAuth, AAA, CAT} = require('../iot-bgw-aaa-client').init(config)
const validate = require('./validate')

const server = net.createServer((srcClient)=> {

  const dstClient = net.connect(config.broker.port, config.broker.address);

  const srcParser = mqtt.parser()
  const dstParser = mqtt.parser()
  srcClient.on('data',(data)=>srcParser.parse(data))
  dstClient.on('data',(data)=>config.authorize_response?dstParser.parse(data):srcClient.write(data))
  dstClient.on('error',()=>{srcClient.destroy();dstClient.destroy()})
  srcClient.on('error',()=>{srcClient.destroy();dstClient.destroy()})

  let client_key =''
  srcParser.on('packet',async (packet)=> {

    //get the client key and store it
    if(packet.cmd == 'connect'){
      client_key = packet.username
      delete packet.username
      config.broker.username && (packet.username = config.broker.username)
      config.broker.password && (packet.password = config.broker.password)
    }

    // validate the packet
    let valid = await validate(packet,client_key)
    valid.packet = valid.packet &&  mqtt.generate(valid.packet)

    if (valid.status){
      dstClient.write(valid.packet)
    } else {
      // if the packet is invlaid in the case of publish or sub and
      // configs for diconnectin on unauthorized is set to tru, then disocnnect
      if((packet.cmd == 'subscribe' && config.disconnect_on_unauthorized_subscribe) ||
         (packet.cmd == 'publish' && config.disconnect_on_unauthorized_publish)){
        AAA.log(CAT.CON_TERMINATE,'disconnecting client for unauthorized %s, ',packet.cmd);
        srcClient.destroy();
        dstClient.destroy();
      } else {

        valid.packet && srcClient.write(valid.packet)
      }
    }


  })
  dstParser.on('packet', async (packet)=>{
    // only when autherize responce config is set true, i validate each responce to subscriptions
    if (packet.cmd=='publish' && !(await mqttAuth(client_key,'SUB',packet.topic))){
      if(config.disconnect_on_unauthorized_response ){
        AAA.log(CAT.CON_TERMINATE,'disconnecting client for unauthorize subscription due to change user auth profile');
        srcClient.destroy();
        dstClient.destroy();
      }
    } else {
      srcClient.write(mqtt.generate(packet))
    }
  })
});


server.listen(config.bind_port, config.bind_port,()=>
AAA.log(CAT.PROCESS_START,`listening on ${config.bind_address}:${config.bind_port}`));
