// for cluster mode
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;
// end of cluster mode
const fs = require('fs');
const net = require('net');
const tls = require('tls')
const mqtt = require('mqtt-packet')
const config = require('./config')
const {mqttAuth, AAA, CAT, isDebugOn,debug} = require('../iot-bgw-aaa-client')
const validate = require('./validate')


if (config.cluster_mode && cluster.isMaster) {
  AAA.log(CAT.PROCESS_START,`Master PID ${process.pid} is running: CPU has ${numCPUs} cores`);
  for (let i = 0; i < numCPUs; i++) cluster.fork();
  cluster.on('exit', (worker, code, signal) =>  AAA.log(CAT.PROCESS_END,`worker ${worker.process.pid} died`));

} else {
  const createServer = config.direct_tls_mode ? tls.createServer : net.createServer
  const serverOptions = config.direct_tls_mode?{
    key: fs.readFileSync(config.tls_key),
    cert: fs.readFileSync(config.tls_cert)
  }:{}
  const broker = config.broker
  const clientOptions = {
    host:broker.address,
    port: broker.port,
    ca: broker.tls && broker.tls_ca && [ fs.readFileSync(broker.tls_ca) ],
    key: broker.tls && broker.tls_client_key && fs.readFileSync(broker.tls_client_key) ,
    cert: broker.tls && broker.tls_client_cert && fs.readFileSync(broker.tls_client_cert)
  }

  const server = createServer(serverOptions,(srcClient)=> {

    const socketConnect = broker.tls?tls.connect:net.connect
    const dstClient = socketConnect(clientOptions,()=>{
      const srcParser = mqtt.parser()
      const dstParser = mqtt.parser()
      srcClient.on('data',(data)=>srcParser.parse(data))
      dstClient.on('data',(data)=>config.authorize_response?dstParser.parse(data):srcClient.write(data))
      dstClient.on('error',(err)=>{AAA.log(CAT.CON_TERMINATE,'Error in forwarding mostly due havey load');srcClient.destroy();dstClient.destroy()})
      srcClient.on('error',(err)=>{AAA.log(CAT.CON_TERMINATE,'Error in forwarding mostly due havey load');srcClient.destroy();dstClient.destroy()})

      let client_key =''
      srcParser.on('packet',async (packet)=> {
        isDebugOn && debug('message from client',JSON.stringify(packet,null,4))

        //get the client key and store it
        if(packet.cmd == 'connect'){
          client_key = packet.username
          delete packet.username
          delete packet.password
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
        isDebugOn && debug('message from broker',JSON.stringify(packet,null,4))
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
    })
  });


  server.listen(config.direct_tls_mode || config.bind_port, config.bind_address,()=>
  AAA.log(CAT.PROCESS_START,`PID ${process.pid} listening on ${config.bind_address}:${config.direct_tls_mode || config.bind_port}`));

}
