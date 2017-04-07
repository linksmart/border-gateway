const app = require('express')();
const tranform = require('transformer-proxy');
const proxy = require('http-proxy').createProxyServer({});
const auth = require('./auth_client')
const { config, transformURI, getRequestType, REQ_TYPES } = require('./utils')


app.use(async(req, res)=> {
  const dest = getRequestType(req)
  if (dest.type == REQ_TYPES.UNKNOWN_REQUEST) {
    res.status(404).json({error:'unknow request type please make sure to use the full address '+config.external_domain+":"+config.external_port})
    return
  }
  const allowed = await auth(req,dest.forward_address);
  if(allowed){
    if (dest.type == REQ_TYPES.FORWARD_W_T) {
      tranform(transformURI)(req,res,()=> proxy.web(req, res,{target:dest.forward_address}))
    }
    else{
      proxy.web(req,res,dest.forward_address)
    }
  }else {
    res.status(403).json({error:'unauthorized request'})
  }


});
proxy.on('error', function (err, req, res) {
  res.status(500).json({error:`There is a problem with the internal forward address, make suer the internal address exist and working: `,})
});

app.listen(config.bind_port, config.bind_address,()=>
console.log("iot-bgw-http-proxy listening on %s:%d ",config.bind_address,  config.bind_port));
