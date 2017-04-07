

const fs = require('fs');
const tls = require('tls');
const Proxy =  require('tcp-proxy')
const insubnet = require('insubnet')
const config = require('./config.json')


var options = {
  key: fs.readFileSync(config.tls_key),
  cert: fs.readFileSync(config.tls_cert),
  requestCert:config.request_client_cert,
  rejectUnauthorized: config.request_client_cert,
  ca: config.request_client_cert  && config.client_ca_path && fs.readFileSync(config.client_ca_path),
  ALPNProtocols: config.enable_ALPN_mode &&  ['bgw_info'].concat(config.servers.map(e=>e.name))
}

config.servers.forEach((srv) => {
  const external_interface = tls.createServer(options,function(client) {

    client.on('error',()=>client.destroy())
    const subdomain = client.servername.includes(config.external_domain) && client.servername.replace(new RegExp('.?'+config.external_domain),'')
    const SNI_srv = config.enable_SNI_mode && subdomain && config.servers.find((e)=>e.name==subdomain)
    const ALPN_srv = config.enable_ALPN_mode && client.alpnProtocol && config.servers.find((e)=>e.name==client.alpnProtocol)

    const { dest_address, dest_port, allowed_addresses} = ALPN_srv || SNI_srv || srv

    if(config.private_bgw &&
      (!insubnet.Validate(client.remoteAddress,config.global_allowed_addresses) ||
       !insubnet.Validate(client.remoteAddress,allowed_addresses||[]))){
      console.log('This is a private BGW: illegal connection made by %s',client.remoteAddress);
      client.destroy()

    } else if (config.enable_ALPN_mode && client.alpnProtocol=='bgw_info'){
        client.end(config.servers.reduce((a,c)=>a+','+c.name,''));
    } else {
      const proxy = new Proxy();
      const options = { target: { host:dest_address, port:dest_port }};
      proxy.proxy(client,options)
    }

  })
  external_interface.listen(srv.bind_port,srv.bind_address,()=>
  console.log("Forwarding %s %s:%d ===> %s:%d",srv.name, srv.bind_address, srv.bind_port, srv.dest_address, srv.dest_port));
})
