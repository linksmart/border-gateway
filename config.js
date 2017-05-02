let config = {
  bind_address: "127.0.0.1",
  bind_port: 5050,
  external_domain: process.env.EXTERNAL_DOMAIN || "bgw.hareeqi.com",
  external_port:"443",
  sub_domain_mode:false,
  only_forward_aliases:false,
  override_authorization_header:"",
  disable_bgw_key_as_url_query:false,
  change_origin_on:{
    https_req:false,
    http_req:false
    },
  redirect_to_orginal_address_on_proxy_error:true,
  redirect_on_invalid_external_domain:true,
  aliases: {
    rc:{
      local_address: "http://almanac-scral1:8081",
      change_origin_on:{
        https_req:false,
        http_req:false
        },
      translate_local_addresses:{
        enabled:false,
        whitelist:["*.ietf.org"]
        },
      override_authorization_header:"",
      use_basic_auth:false
      }
    },
  aaa_client:{
    name:"http-proxy",
    log_level:'info',
    no_color:false,
    timestamp:false,
    disable_cat:[],
    secret: process.env.TLS_KEY || "./config/key.pem",
    host: "http://localhost:5055"
    }
}

require('../iot-bgw-aaa-client').init("HTTP_PROXY",config)
module.exports = config
