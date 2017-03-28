

const fs = require('fs');
const tls = require('tls');
const Proxy =  require('tcp-proxy')
const insubnet = require('insubnet')
const configs = require('./config.json')


var options = {
  key: fs.readFileSync(configs.tls_key),
  cert: fs.readFileSync(configs.tls_cert)
}

configs.servers.forEach(({name, bind_address, bind_port, dest_address, dest_port}) => {
  const external_interface = tls.createServer(options,function(client) {
    if(configs.private_bgw && !insubnet.Validate(client.remoteAddress,configs.allowed_addresses)){
      console.log('This is a private BGW: illegal connection made by %s',client.remoteAddress);
      client.destroy()

    } else {
      const proxy = new Proxy();
      const options = { target: { host:dest_address, port:dest_port }};
      proxy.proxy(client,options)
    }

  })
  external_interface.listen(bind_port,bind_address);
  console.log("Forwarding %s %s:%d ===> %s:%d",name, bind_address, bind_port, dest_address, dest_port);
})
