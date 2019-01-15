const config = require('./config');
const {transformURI ,decode } = require("./translate_res");
const axios = require("axios");
const {AAA, CAT, debug, isDebugOn} = require('../bgw-aaa-client');

const TYPES = {
  FORWARD: 'FORWARD',
  FORWARD_W_T: 'FORWARD_W_T',
  UNKNOWN_REQUEST: 'UNKNOWN_REQUEST',
  INVALID_EXTERNAL_DOMAIN:"INVALID_EXTERNAL_DOMAIN"
};

const httpAuth = async (req) => {

    if (config.no_auth || req.bgw.alias.no_auth) {

        return {
            isAllowed: true
        }
    }

    AAA.log(CAT.DEBUG, 'req.headers.host:', req.headers.host, ' req.headers[x-forwarded-host]:', req.headers['x-forwarded-host']);
    let httpHost = req.headers['x-forwarded-host'] || req.headers.host;
    const splitHost = httpHost.split(":");
    let host = splitHost[0];
    let port = splitHost[1] || 80;
    let protocol = 'HTTP';
    if (req.headers['x-forwarded-proto']) {
        protocol = req.headers['x-forwarded-proto'].toUpperCase();
    }

    const path = req.originalUrl.replace('//', '/');
    const payload = `${protocol}/${req.method}/${host}/${port}${path}`;

    let response;
    try {
        response = await axios({
            method: 'post',
            headers: {authorization: req.headers.authorization || ""},
            url: config.auth_service,
            data: {
                rule: payload,
                openidConnectProviderName: req.bgw.alias.openidConnectProviderName || config.openidConnectProviderName || 'default'
            }
        });
    }
    catch (error) {
        AAA.log(CAT.DEBUG, 'auth-service returned an error message:', error.name, error.message);
        return {
            isAllowed: false,
            error: "Error in auth-service, " + error.name + ": " + error.message
        };
    }

    req.headers.authorization = (req.bgw.alias && req.bgw.alias.keep_authorization_header && req.headers.authorization) || "";

    return response.data;

};

const bgwIfy = (req) => {
  req.bgw = {};

  //const public_domain = config.sub_domain_mode ?  host.includes(config.external_domain) : host === config.external_domain;

    AAA.log(CAT.DEBUG, 'req.headers.host:', req.headers.host, ' req.headers[x-forwarded-host]:', req.headers['x-forwarded-host']);
    let httpHost = req.headers['x-forwarded-host'] || req.headers.host;
    const splitHost = httpHost.split(":");
    let host = splitHost[0];
    let public_domain = false;

    if(config.domains[host])
    {
        public_domain = true;
    }

    if(!public_domain){
    req.bgw = {type:TYPES.INVALID_EXTERNAL_DOMAIN};
    return
  }
  // check if subdomain mode e.g. https://rc.gateway.com or https://gateway.com/rc
  //let local_dest =  config.sub_domain_mode ? host.split(config.external_domain).filter((e)=>e!=="")[0]:req.url.split(/\/|\?|\#/)[1];
   let urlArray = req.url.split(/\/|\?|\#/);
    let local_dest = urlArray[1];
    local_dest = local_dest && local_dest.replace(".","");
  //req.url =  config.sub_domain_mode ? req.url : req.url.replace(`/${local_dest}`,"");
    req.url =  req.url.replace(`/${local_dest}`,"");

    if(config.domains[host][local_dest]) {
    req.bgw = {
      forward_address: config.domains[host][local_dest].local_address,
      alias:config.domains[host][local_dest]
    };

    const translate = req.bgw.alias.translate_local_addresses;
    req.bgw.type = (translate) ? TYPES.FORWARD_W_T:TYPES.FORWARD;
    return
  }

  const decoded_local_dest = local_dest && decode(local_dest);
  if(local_dest && decoded_local_dest ){
    req.bgw = {type:TYPES.FORWARD, forward_address:decoded_local_dest};
    return
  }
  req.bgw = {type:TYPES.UNKNOWN_REQUEST}
};

module.exports.httpAuth = httpAuth;
module.exports.bgwIfy = bgwIfy;
module.exports.REQ_TYPES = TYPES;
module.exports.transformURI = transformURI;
