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
  } else if(dest.type == REQ_TYPES.BASIC_AUTH) {
    res.set('WWW-Authenticate', 'Basic realm="User Visible Realm"');
    res.status(401).json({error:'enter username and password'})
  }

  const allowed =  await auth(req,dest.forward_address);
  if(allowed){
    const proxyied_options= {
      target: dest.forward_address|| 'error' ,
      changeOrigin: config.change_orgin_on_proxy_request || dest.forward_address .includes('https://')
    }
    const proxyied_request = ()=> proxy.web(req, res,proxyied_options)

    if (dest.type == REQ_TYPES.FORWARD_W_T) {
      tranform(transformURI)(req,res,()=>proxyied_request())
    }
    else{
      proxyied_request()
    }
  }else {
    res.status(403).json({error:'unauthorized request'})
  }


});
proxy.on('error', function (err, req, res) {
  req.url = req.originalUrl;
  const dest = req && getRequestType(req)
  if(dest && dest.forward_address){
    config.auto_redirect_to_orginal_address_on_proxy_error ?  res.redirect( dest.forward_address+req.url) :
      res && res.status(500).json({error:`iot border gateway could not forward your request to ${dest.forward_address}`})
  }else {
    res && res.status(500).json({error:`There is a problem with the internal forward address, make suer the internal address exist and working: `})
  }

});

app.listen(config.bind_port, config.bind_address,()=>
console.log("iot-bgw-http-proxy listening on %s:%d ",config.bind_address,  config.bind_port));
