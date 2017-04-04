

const net = require('net');
const mqtt = require('mqtt-packet')
const config = require('./config.json')
const validate = require('./validate')
const auth = require('./auth_client')

const server = net.createServer((srcClient)=> {

  const dstClient = net.connect(config.broker.port, config.broker.address);


  const srcParser = mqtt.parser()
  const dstParser = mqtt.parser()
  srcClient.on('data',(data)=>srcParser.parse(data))
  dstClient.on('data',(data)=>config.broker.authorize_response?dstParser.parse(data):srcClient.write(data))
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
    console.log("%c client",'color:blue');
    console.log(packet);

    // validate the packet
    let valid = await validate(packet,client_key)
    valid.packet = valid.packet &&  mqtt.generate(valid.packet)
    if (valid.status){

      dstClient.write(valid.packet)

    } else {
      // if the packet is invlaid in the case of publish or sub and
      // congis for diconnectin on unauthorized is set to tru, then disocnnect
      if((packet.cmd == 'subscribe' && config.disconnect_on_unauthorized_subscribe) ||
         (packet.cmd == 'publish' && config.disconnect_on_unauthorized_publish)){
        console.log('disconnecting client for unauthorized operation', client_key);
        srcClient.destroy();
        dstClient.destroy();
      } else {

        valid.packet && srcClient.write(valid.packet)
      }
    }


  })
  dstParser.on('packet', async (packet)=>{
    console.log("%c server",'color:green');
    console.log(packet);
    // only when autherize responce config is set true, i validate each responce to subscriptions
    if (packet.cmd=='publish' && !(await auth(client_key,'subscribe',packet.topic))){
      if(config.disconnect_on_unauthorized_response ){
        srcClient.destroy();
        dstClient.destroy();
      }
    } else {
      srcClient.write(mqtt.generate(packet))
    }
  })
});


server.listen(config.bind_port, config.bind_port,()=>
console.log("iot-bgw-mqtt-proxy listening on %s:%d ",config.bind_address,  config.bind_port));
