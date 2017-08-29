# IoT-BGW Configuration
* All configs for the bgw are passed as environment variables
* You can supply environment variables from a file by providing config.env or config.json or both
* Each bgw component has a config prifix (**EI_, HTTP_PROXY_, MQTT_PROXY_, AUTH_SERVER_, AAA_CLIENT_**)
* Shared config like the aaa client, can be used globally like AAA_CLIENT_ or selectivily like EI_AAA_CLEINT_
* note: configs in config.json will be converted to environment variables and passed to all components

# Table of Contents
* [Required Configuration](#Required)
* [Global Configuration](#Global)
* [MQTT Proxy](#MQTT)
* [HTTP Proxy](#HTTP)
* [External Interface](#EI)
* [Auth Server](#Auth)
* [AAA Client](#AAA)
* [Open ID](#OpenID)

<a name="Required"></a>
### Required Configuration

```
EXTERNAL_DOMAIN=bgw.hareeqi.com
```
String to the external domain name, by default it is bgw.hareeqi.com which resolves to `127.0.0.1 (localhost)`
```
TLS_CERT=./config/srv.pem
```
File path to TLS certificate
```
TLS_KEY=./config/key.pem
```
File path to TLS key


note: These configs can be set for a a single component by perpending the component prefix (i.e `HTTP_PROXY_TLS_KEY`)

<a name="Global"></a>
### Global Configuration

```
ENABLE_EI=false
```
The flag enables the external interface with all its features ( It is used in `./bgw.sh start enable_ei`)
```
SINGLE_CORE=false
```
By default the BGW runs multiple process for each CPU virtual core. It is important for scalability. Setting this to true will hinder scalability/performance and run the BGW on a single CPU virtual core only (it is used in `./bgw.sh dev`)

```
DISABLE_BIND_TLS=false
```
By default HTTP and MQTT Proxies bind on a TLS port, when `ENABLE_EI` is true then this becomes true and binding for MQTT and HTTP becomes not TLS as the External Interface will provide TLS termination instead.


note: hese configs can be set for a a single component by perpending the prefix (i.e `HTTP_PROXY_SINGLE_CORE`)

<a name="MQTT"></a>
### MQTT Proxy

```
MQTT_PROXY_BIND_ADDRESS=0.0.0.0
```
The default bind address for MQTT Proxy is `0.0.0.0` where if the `enable_ei` is true then the default bind address is `127.0.0.1`
```
MQTT_PROXY_BIND_PORT=8883
```
The default bind port for MQTT Proxy is `8883` where if the `enable_ei` is true then the default bind port is `5051`
```
MQTT_PROXY_DISCONNECT_ON_UNAUTHORIZED_PUBLISH=false
```
If a client tries to make an unauthorized publish operation the default is to ignore it, setting this to true will disconnect the connecting client
```
MQTT_PROXY_DISCONNECT_ON_UNAUTHORIZED_SUBSCRIBE=false
```
If a client tries to make an unauthorized subscribe operation the default is to send 128 in qos topi in `SUBACK`. Setting this to true will disconnect the connecting client
```
MQTT_PROXY_AUTHORIZE_RESPONSE=false
```
By default only requests operation from the client to the broker are authorized. Setting this to true will allow operations from the broker to the client to be authorized as well. This is useful when a user subscribe once and after a while you change the user subscriptions permissions.
```
MQTT_PROXY_DISCONNECT_ON_UNAUTHORIZED_RESPONSE=false
```
Recommended to be used with the config above `MQTT_PROXY_AUTHORIZE_RESPONSE`
```
MQTT_PROXY_BROKER={"address":"iot.eclipse.org","port":1883,"username":"","password":"","tls":false,"tls_ca": "","tls_client_key":"","tls_client_cert":""}
```
The upstream broker information encoded in JSON. you can connect to a TLS broker with username and password and provide a Certificate Authority and client certificates

### HTTP Proxy
<a name="HTTP"></a>
```
HTTP_PROXY_BIND_ADDRESS=0.0.0.0
```
The default bind address for HTTP Proxy is `0.0.0.0` where if the `enable_ei` is true then the default bind address is `127.0.0.1`
```
HTTP_PROXY_BIND_PORT=8883
```
The default bind port for HTTP Proxy is `443` where if the `enable_ei` is true then the default bind port is `5050`
```
HTTP_PROXY_EXTERNAL_PORT=443
```
This has nothing to do with the bind port, it is mainly used for translating internal addresses in the HTTP response
```
HTTP_PROXY_SUB_DOMAIN_MODE=false
```
When true you can use `https://alias1.bgw.com` instead of `https://bgw.com/alias1`
```
HTTP_PROXY_ONLY_FORWARD_ALIASES=false
```
When true the BGW will only forward defined aliases in the configs and not encoded addrress provided by translation
```
HTTP_PROXY_OVERRIDE_AUTHORIZATION_HEADER=false
```
Insert an autherization header to all HTTP requests forwarded through the BGW HTTP Proxy. Usefull for internal auth
```
HTTP_PROXY_DISABLE_BGW_KEY_AS_URL_QUERY=false
```
Can be used as a security measure to prevent the bgw key to appear int the url or browser history
```
HTTP_PROXY_DISABLE_BGW_KEY_AS_URL_QUERY=false
```
Can be used as a security measure to prevent the bgw key to appear int the url or browser history
```
HTTP_PROXY_DISABLE_BGW_KEY_AS_URL_QUERY=false
```
Can be used as a security measure to prevent the bgw key to appear int the url or browser history
