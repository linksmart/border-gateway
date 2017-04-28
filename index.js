const app = require('express')();
const tranform = require('transformer-proxy');
const proxy = require('http-proxy').createProxyServer({});
const { config, transformURI, bgwIfy, REQ_TYPES } = require('./utils')
const {httpAuth, AAA, CAT} = require('../iot-bgw-aaa-client').init(config)


app.use(async(req, res)=> {
  if (req.query.bgw_key && config.disable_bgw_key_as_url_query) {
    res.status(404).json({error:'this gateway does not allow you to pass the API key  as a query string in the url, you must use the authorization header'})
    return
  }

  bgwIfy(req)
  if (req.bgw.type == REQ_TYPES.UNKNOWN_REQUEST) {
    res.status(404).json({error:'unknow request type please make sure to use the full address https://'+config.external_domain+":"+config.external_port})
    return
  }
  if (req.bgw.type == REQ_TYPES.INVALID_EXTERNAL_DOMAIN) {
    config.redirect_on_invalid_external_domain ? res.redirect( 'https://'+config.external_domain+":"+config.external_port+req.originalUrl):
    res.status(404).json({error:'Invalid external domain, use the full address https://'+config.external_domain+":"+config.external_port})
    return
  }
  if(req.bgw.type == REQ_TYPES.PROMPT_BASIC_AUTH) {
    res.set('WWW-Authenticate', 'Basic realm="User Visible Realm"');
    res.status(401).json({error:'enter a valid token as a username'})
    return
  }

  const allowed =  await httpAuth(req);
  if(allowed.status){

    const is_https = req.bgw.forward_address.includes('https://')
    const { http_req, https_req} = (req.bgw.alias && req.bgw.alias.change_origin_on) || config.change_origin_on

    const proxyied_options= {
      target: req.bgw.forward_address || 'error' ,
      changeOrigin:  (http_req && https_req)||
                     (is_https && https_req) ||
                     (!is_https && http_req)
    }
    const proxyied_request = ()=> proxy.web(req, res,proxyied_options)

    req.bgw.type == REQ_TYPES.FORWARD_W_T?
      tranform(transformURI)(req,res,()=>proxyied_request()):proxyied_request()

  }else {
    if(req.bgw.alias && req.bgw.alias.use_basic_auth) {
      res.set('WWW-Authenticate', 'Basic realm="User Visible Realm"');
    }
    res.status(401).json({error: allowed.error || 'unauthorized request'})
  }


});
proxy.on('error', function (err, req, res) {
  if(req.bgw && req.bgw.forward_address){
    config.redirect_to_orginal_address_on_proxy_error ?  res.redirect( req.bgw.forward_address+req.originalUrl) :
      res && res.status(500).json({error:`iot border gateway could not forward your request to ${req.bgw.forward_address}`})
  }else {
    res && res.status(500).json({error:`There is a problem with the internal forward address, make suer the internal address exist and working: `})
  }

});

app.listen(config.bind_port, config.bind_address,()=>
console.log("iot-bgw-http-proxy listening on %s:%d ",config.bind_address,  config.bind_port));
