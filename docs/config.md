# Border Gateway Configuration
* All configuration parameters for the Border Gateway can be set as environment variables
* It is recommended to supply the configuration via a file config.json. These parameters will be converted to environment variables and passed to all components in bgw.sh.
* Each component has a config prefix (**EI_, HTTP_PROXY_, MQTT_PROXY_, AUTH_SERVICE_, AAA_CLIENT_**)
* Shared configuration parameter like the parameters for the AAA client can be defined globally like AAA_CLIENT_ or selectively for each component like EI_AAA_CLIENT_

# Table of Contents
* [External Interface](#EI)
* [Auth Service](#Auth)
* [HTTP Proxy](#HTTP)
* [MQTT Proxy](#MQTT)
* [WebSocket Proxy](#WebSocket)
* [AAA Client](#AAA)
* [User Access Rules](#rules)
<a name="EI"></a>
## External Interface
```
EI_TLS_CERT=/certs/linksmart-dev.fit.fraunhofer.de_cert_with_chain.pem
```
File path to the TLS certificate
```
EI_TLS_KEY=/certs/linksmart-dev.fit.fraunhofer.de_sec_key.pem
```
File path to the TLS key
```
EI_SERVERS=[{name:"http_proxy",bind_addresses:["0.0.0.0"],bind_port:443,dest_port:5050,dest_address:"127.0.0.1"},{name:"mqtt_proxy",bind_addresses:["0.0.0.0"],bind_port:8883,dest_port:5051,dest_address:"127.0.0.1"},{name:"websocket_proxy",bind_addresses:["0.0.0.0"],bind_port:9002,dest_port:5052,dest_address:"127.0.0.1"}]
```
List of the servers to be created by the external interface. It is highly recommended to configure this via json file if necessary.
```
EI_REQUEST_CLIENT_CERT=false
```
When set to true clients connecting to the BGW have to authenticate themselves with a client certificate.
```
EI_CLIENT_CA_PATH=""
```
File path to the certificate authority for client certificates
<a name="Auth"></a>
## Auth Service
```
AUTH_SERVICE_BIND_PORT=5053
```
The default bind port for the auth service is `5053`.
```
AUTH_SERVICE_OPENID_CONNECT_PROVIDERS={default:{issuer:"",token_endpoint:"",client_id:"",client_secret:"",realm_public_key_modulus:"",realm_public_key_exponent:"",anonymous_user:"anonymous",anonymous_pass: "anonymous"}}
```
The BGW supports two ways to integrate with OpenID Connect. You can either send username and password for MQTT or via Basic Auth for HTTP. Or you send an access token retrieved from an OpenID Connect provider as Bearer token for HTTP or in the username field for MQTT. What you send will be determined automatically by the Border Gateway. It is recommended to send access tokens in favor of username and password.
<a name="HTTP"></a>
## HTTP Proxy
```
HTTP_PROXY_BIND_ADDRESSES=[127.0.0.1]
```
The default bind address for WebSocket proxy is `127.0.0.1`.
```
HTTP_PROXY_BIND_PORT=5050
```
The usual bind port for HTTP proxy is `5050`.
```
HTTP_PROXY_SUB_DOMAIN_MODE=false
```
When true you can use `https://alias1.bgw.com` instead of `https://bgw.com/alias1`
```
HTTP_PROXY_CHANGE_ORIGIN_ON={"https_req":false,"http_req":false}
```
Change the origin of in the HTTP request to match the internal resource being forwarded to.
```
HTTP_PROXY_DOMAINS= {"imagon.fit.fraunhofer.de":{"sc":{"local_address":"http://192.168.98.100:8082","translate_local_addresses":{"whitelist":["*.linksmart.eu","demo.linksmart.eu"]}}}
```
The domains and locations are the most critical config in the HTTP Proxy. Its value is a JSON encoded string that allows you to define short names for internal services to be accessible from outside. Each domain and its locations can be defined with the following properties:
  * **local_address:** "http://192.168.98.100:8082"
  * **change_origin_on:** {"https_req":false,"http_req":false}
  * **translate_local_addresses:** {"whitelist":["*.linksmart.eu","demo.linksmart.eu"]}
  * **insecure:** false
Translation allows you to encode all URLs in the HTTP response of this alias to base64 and enables it to be accessible from outside. White-listing of translation allows you to exclude certain domains from the translation. The insecure flag disables the checking of a TLS validity of an internal address. Basic auth allows you enable user name and password prompts on any internal website.
<a name="MQTT"></a>
## MQTT Proxy
```
MQTT_PROXY_BIND_ADDRESSES=[127.0.0.1]
```
The default bind address for MQTT Proxy is `127.0.0.1`.
```
MQTT_PROXY_BIND_PORT=5051
```
The default bind port for MQTT proxy is `5051`.
```
MQTT_PROXY_DISCONNECT_ON_UNAUTHORIZED_PUBLISH=false
```
If a client tries to make an unauthorized publish operation this is ignored by default. Setting this to true will disconnect the client.
```
MQTT_PROXY_DISCONNECT_ON_UNAUTHORIZED_SUBSCRIBE=false
```
If a client tries to make an unauthorized subscribe operation the default is to send 128 in qos topic in `SUBACK`. Setting this to true will disconnect the client
```
MQTT_PROXY_AUTHORIZE_RESPONSE=false
```
By default only requests from the client to the broker are authorized. Setting this to true will allow operations from the broker to the client to be authorized as well. This is useful when a user subscribes once and after a while you change the subscription permissions.
```
MQTT_PROXY_BROKER={"address":"localhost","port":1883,"username":"","password":"","tls":false,"tls_ca": "","tls_client_key":"","tls_client_cert":""}
```
The upstream broker information encoded in JSON. You can connect to a broker with username and password and provide a certificate authority and client certificates.
<a name="WebSocket"></a>
## WebSocket Proxy
```
WEBSOCKET_PROXY_BIND_ADDRESSES=[127.0.0.1]
```
The default bind address for WebSocket proxy is `127.0.0.1`.
```
WEBSOCKET_PROXY_BIND_PORT=5052
```
The default bind port for WebSocket proxy is `5052` when external interface is enabled.
<a name="AAA"></a>
## AAA Client
The AAA Client the component shared among all BGW services providing logging and configuration management. All configuration parameters below can be limited to a certain component by providing the component prefix i.e `HTTP_PROXY_`
```
AAA_CLIENT_NAME= http-proxy | mqtt-proxy | ...
```
The name that will appear in the logs from that component
```
AAA_CLIENT_LOG_LEVEL=info
```
the log level, available levels are `all, debug, info, warn, error, fatal, off`
```
AAA_CLIENT_NO_TIMESTAMP=false
```
Choose if a timestamp is to be provided to the logs.
<a name="rules"></a>
## User Access Rules
Rules are defined using user/group attributes in the OpenID Connect provider and then included in the access token. The attributes in OpenID must be named `bgw_rules` and `group_bgw_rules`.
The rules format is similar to an MQTT topic format
Rule 1: "HTTP/GET/example.com/80/building1/#"
```
  examples  GET https://example.com/building1/floor1/temperature (ALLOW)
            GET https://example.com/building1/floor2 (ALLOW)
            GET https://example.com/building2/floor1 (DENY)
```
Rule 2: "MQTT/SUB/example.com/8883/building1/+/temperature”
```
  examples  SUB mqtts://example.com:8883/building1/floor1/temperature (ALLOW)
            SUB mqtts://example.com:8883/building2/floor2/temperature (DENY)
            SUB mqtts://example.com:8883/building1/floor3/humidity (DENY)
```            
