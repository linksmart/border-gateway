const app = require('express')();
const tranform = require('transformer-proxy');
const proxy = require('http-proxy').createProxyServer({});
const { config, transformURI, bgwIfy, REQ_TYPES } = require('./utils')
const auth = require('../iot-bgw-auth-client').init(config).http

app.use(async(req, res)=> {
  bgwIfy(req)
  if (req.bgw.type == REQ_TYPES.UNKNOWN_REQUEST) {
    res.status(404).json({error:'unknow request type please make sure to use the full address '+config.external_domain+":"+config.external_port})
    return
  } else if(req.bgw.type == REQ_TYPES.PROMPT_BASIC_AUTH) {
    res.set('WWW-Authenticate', 'Basic realm="User Visible Realm"');
    res.status(401).json({error:'enter a valid token as a username'})
    return
  }

  const allowed =  await auth(req);
  if(allowed.status){

    const isHttps = req.bgw.forward_address.includes('https://')
    const {all_requests, http_requests, https_requests} = config.change_origin_on

    const proxyied_options= {
      target: req.bgw.forward_address || 'error' ,
      changeOrigin: all_requests || (isHttps && https_requests) || (!isHttps && http_requests)
    }
    const proxyied_request = ()=> proxy.web(req, res,proxyied_options)

    req.bgw.type == REQ_TYPES.FORWARD_W_T?
      tranform(transformURI)(req,res,()=>proxyied_request()):proxyied_request()

  }else {
    if(req.bgw.alias && config.aliases[req.bgw.alias].use_basic_auth) {
      res.set('WWW-Authenticate', 'Basic realm="User Visible Realm"');
    }
    res.status(401).json({error: allowed.error || 'unauthorized request'})
  }


});
proxy.on('error', function (err, req, res) {
  if(req.bgw && req.bgw.forward_address){
    config.auto_redirect_to_orginal_address_on_proxy_error ?  res.redirect( req.bgw.forward_address+req.originalUrl) :
      res && res.status(500).json({error:`iot border gateway could not forward your request to ${req.bgw.forward_address}`})
  }else {
    res && res.status(500).json({error:`There is a problem with the internal forward address, make suer the internal address exist and working: `})
  }

});

app.listen(config.bind_port, config.bind_address,()=>
console.log("iot-bgw-http-proxy listening on %s:%d ",config.bind_address,  config.bind_port));
