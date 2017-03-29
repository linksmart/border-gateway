

const net = require('net');
const config = require('./config.json')
const mqtt = require('mqtt-packet')


const server = net.createServer((srcClient)=> {

  const dstClient = net.connect(config.default_broker.port, config.default_broker.address, ()=> {

    const srcParser = mqtt.parser()
    const dstParser = mqtt.parser()

    srcClient.on('data',(data)=>srcParser.parse(data))
    dstClient.on('data',(data)=>dstParser.parse(data))

    srcParser.on('packet',(packet)=> {
      //console.log("%c client",'color:blue');
      //console.log(packet);
      dstClient.write(mqtt.generate(packet))
    })
    dstParser.on('packet',(packet)=>{
      //console.log("%c server",'color:green');
      //console.log(packet);
      srcClient.write(mqtt.generate(packet))
    })
  });

});


server.listen(config.bind_port, config.bind_port);
console.log("iot-bgw-mqtt-proxy listening on %s %d ",config.bind_address,  config.bind_port)
