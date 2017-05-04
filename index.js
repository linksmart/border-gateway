const net = require('net');
const tls = require('tls')
const mqtt = require('mqtt-packet')
const config = require('./config')
const {mqttAuth, AAA, CAT} = require('../iot-bgw-aaa-client')
const validate = require('./validate')

const broker = config.broker
const options = {
  host:broker.address,
  port: broker.port,
  ca: broker.tls && broker.tls_ca && [ fs.readFileSync(broker.tls_ca) ],
  key: broker.tls && broker.tls_client_key && fs.readFileSync(broker.tls_client_key) ,
  cert: broker.tls && broker.tls_client_cert && fs.readFileSync(broker.tls_client_cert)
}

const server = net.createServer((srcClient)=> {

  const dstClient = broker.tls?tls.connect(options):net.connect(options)

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
      broker.username && (packet.username = broker.username)
      broker.password && (packet.password = broker.password)
    }

    // validate the packet
    let valid = await validate(srcClient.remotePort,packet,client_key)
    valid.packet = valid.packet &&  mqtt.generate(valid.packet)

    if (valid.status){
      dstClient.write(valid.packet)
    } else {
      // if the packet is invlaid in the case of publish or sub and
      // configs for diconnectin on unauthorized is set to tru, then disocnnect
      if((packet.cmd == 'subscribe' && config.disconnect_on_unauthorized_subscribe) ||
         (packet.cmd == 'publish' && config.disconnect_on_unauthorized_publish)){
        AAA.log(CAT.CON_TERMINATE,'disconnecting client for unauthorized ',packet.cmd);
        srcClient.destroy();
        dstClient.destroy();
      } else {

        valid.packet && srcClient.write(valid.packet)
      }
    }


  })
  dstParser.on('packet', async (packet)=>{
    // only when autherize responce config is set true, i validate each responce to subscriptions
    if (packet.cmd=='publish' && !(await mqttAuth(srcClient.remotePort,client_key,'SUB',packet.topic))){
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
