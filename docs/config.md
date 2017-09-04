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
* [User Access Rules](#rules)

<a name="Required"></a>
## Required Configuration

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


note: These configs can be set for a a single component by perpending the prefix (i.e `HTTP_PROXY_TLS_KEY`)

<a name="Global"></a>
## Global Configuration

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
```
ADMIN_KEY_PASSWORD=""
```
By default every time the auth server is restarted, it generates a new BGW admin key that can be found in `admin_api_key.txt` file in the config folder. This key always re-generate with every restart as a a security measure. However during development or setup this can be a hassle so this option allows you set a fixed string that ensures the BGW admin key remains the same even when the auth server is restarted.



note: These configs can be set for a a single component by perpending the prefix (i.e `HTTP_PROXY_SINGLE_CORE`)

<a name="MQTT"></a>
## MQTT Proxy

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

<a name="HTTP"></a>
## HTTP Proxy
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
When true the BGW will only forward defined aliases in the configs and not encoded addresses provided by translation
```
HTTP_PROXY_OVERRIDE_AUTHORIZATION_HEADER=false
```
Insert an authorization header to all HTTP requests forwarded through the BGW HTTP Proxy. Useful for internal auth
```
HTTP_PROXY_DISABLE_BGW_KEY_AS_URL_QUERY=false
```
Can be used as a security measure to prevent the bgw key to appear int the url or browser history
```
HTTP_PROXY_CHANGE_ORIGIN_ON={"https_req":false,"http_req":false}
```
Change the origin of in the HHTP request to match the match the internal resource being forwarded to
```
HTTP_PROXY_REDIRECT_TO_ORIGINAL_ADDRESS_ON_PROXY_ERROR=false
```
In case the HTTP proxy could not forward the request to the internal server setting this to true will return 301 redirecting to the original int location
```
HTTP_PROXY_REDIRECT_ON_INVALID_EXTERNAL_DOMAIN=false
```
When trying to access by IP address or another domain, setting this true will redirect to the correct domain.
```
HTTP_PROXY_ALIASES={"alias1":{"local_address":"http://alman:8081" .... },"rc2":{"local_address":"http://saar:8081"}}
```
Aliases is the most critical config in the HTTP Proxy. Its value is a JSON encoded string that allows you to define short names for internal services to be accessible from outside instead of using encoded long URLs. Each alias can be defined with the following properties:
  * **local_address:** "http://saar:8081"
  * **override_authorization_header:** ""
  * **change_origin_on:** {"https_req":false,"http_req":false}
  * **translate_local_addresses:** {"enabled":false, "whitelist":["\*.ietf.org"]}
  * **insecure:** false
  * **use_basic_auth:** false

Translation allows you to encode all URLs in the HTTP response of this alias to base64 and enables it to be accessible from outside. white-listing
of translation allows you to exclude certain domains or translation. The insure flag disables the checking of a TLS validity of an internal address. Basic auth allows you enable user name and password prompts on any internal website.


<a name="EI"></a>
## External Interface
The BGW is an optional component to the BGW that enables extra features that can be used with HTTP or MQTT proxy and can be started with. `./bgw.sh start enable_ei`

```
EI_REQUEST_CLIENT_CERT=false
```
clients connecting to the BGW have to authenticate them selfs with a certificate
```
EI_CLIENT_CA_PATH=""
```
File path to the certificate authority for connecting clients certificate
```
EI_ENABLE_ALPN_MODE=""
```
Allows running multiple protocols on the same port using the TLS ALPN extension.
```
EI_ENABLE_SNI_MODE=""
```
Allows running multiple protocols on the same port using sub-domains available in the TLS SNI extension.
```
EI_PRIVATE_BGW=false
```
Setting this to true enables IP filtering based on source addresses
```
EI_GLOBAL_ALLOWED_ADDRESSES=["0.0.0.0/0"]
```
When `EI_PRIVATE_BGW` config is true you can filter IP networks/subnets by providing an array of the filtered networks
```
EI_SERVERS=[{"name":"http_proxy"....},{"name":"mqtt_proxy"....}]
```
A JSON string indicates the other BGW components the external interface is pointing to, by defaults it only points to HTTP and MQTT proxy. each internal BGW component can have the following properties:
* **name:** "http_proxy"
* **bind_address:**  "0.0.0.0"
* **bind_port:** 443
* **dest_port:** 5050
* **dest_address:** "127.0.0.1"
* **allowed_addresses:** ["0.0.0.0/0"]

The name property is also used for the ALPN mode.



<a name="Auth"></a>
## Auth Server
The Auth Server is an Identity Management and Access Control Server (IAM) that can be access using the [REST API](../README.md#swagger). The Auth server has the following configs

```
AUTH_SERVER_BIND_ADDRESS=127.0.0.1
```
The default bind address for Auth Server is `127.0.0.1`
```
AUTH_SERVER_BIND_PORT=5055
```
The default bind port for the Auth Server is `5055`
```
AUTH_SERVER_ DB_FILE_PATH="./config/bgw_db"
```
The Auth Server will create the leveldb files in this path
```
AUTH_SERVER_API_ADMIN_KEY_FILE_PATH="./config/"
```
When the Auth sever starts it will create the BGW Admin Key file in the following path
```
AUTH_SERVER_VALID_TO="365*24*60*60"
```
Whenever you create a new user using the REST API, By default the generated key will be valid for only one year unless the valid_to field was specified in the REST request or the default configuration above is changed.



<a name="AAA"></a>
## AAA Client
The AAA Client is a shared component among all BGW components, It provides Authentication, Authorization and Accounting to the BGW. All the below configs can be limited to a certain component by providing the component prefix i.e `HTTP_PROXY_`

```
AAA_CLIENT_NAME= http-proxy | mqtt-proxy | ...
```
The name that will appear in the logs from that component
```
AAA_CLIENT_LOG_LEVEL=info
```
the log level, available levels are `all, debug, info, warn, error, fatal, off`
```
AAA_CLIENT_NO_COLOR= false
```
Setting this to true will disable colors from appearing in the console
```
AAA_CLIENT_TIMESTAMP=false
```
Your logging service doesn't provide a timestamps, this will generate one
```
AAA_CLIENT_DISABLE_CAT=[]
```
Disables a certain logging category from appearing, Possible values for the array `PROCESS_START, PROCESS_END, BUG, DEBUG, RULE_ALLOW, CON_TERMINATE, CON_START, CON_END, RULE_DENY, PROFILE, PASSWORD, SUSPENDED, EXPIRED, INVALID_KEY, MISSING_KEY, WRONG_AUTH_SERVER_RES`
```
AAA_CLIENT_CACHE_FOR='10*60'
```
When a profile retrieved from the Auth Server it is cached for 10 minutes by default (In open id when correct credentials are provided, the access token is cached till the according to the exp field)
```
AAA_CLIENT_NO_COLOR= false
```
Setting this to true will disable colors from appearing in the console
```
AAA_CLIENT_PURGE_EXP_CACHE_TIMER='24*60*60'
```
By default every day the BGW will purge expired cached profiled from memory who have not been used again.
```
AAA_CLIENT_SECRET= TLS_KEY file path
```
By default the BGW will use the TLS key file, hash it and then use it as secret for HMAC key generation using the bgw Auth Server
```
AAA_CLIENT_AUTH_PROVIDER=internal
```
The auth provider mode `internal` or `openid`
```
AAA_CLIENT_HOST="http://localhost:5055"
```
The url for the BGW Auth Server or open id provider

<a name="OpenID"></a>
## Open ID
In case you would like to use an IAM provider other than the BGW Auth Server. You can use Open ID through key clock server for example. below are the configs.
```
AAA_CLIENT_AUTH_PROVIDER=openid
```
Setting auth provider to `openid`
```
AAA_CLIENT_HOST=https://auth.fit.fraunhofer.de/kc/realms/bgw_example
```
The openid provider URL
```
AAA_CLIENT_OPENID_CLIENTID=bgw_client
```
Open id client id
```
AAA_CLIENT_OPENID_CLIENTSECRET=""
```
The openid client secert
```
AAA_CLIENT_OPENID_GRANT_TYPE="password"
```
The BGW supports  three open if grant types `password` , `token`, `authorization_code`. For authorization_code the redirect_uri is the same as the host above.
```
AAA_CLIENT_OPENID_ANONYMOUS_USER=anonymous
```
User name for an profile designated for anonymous users who doesn't provide credentials. This is important if you want some internal services to be accessible publicly  

```
AAA_CLIENT_OPENID_ANONYMOUS_PASS=anonymous
```
The password for the anonymous user.



<a name="rules"></a>
## User Access Rules
Rules are defined either in the BGW Auth server useing the REST API above or using user/group attributes in open id and include it in the access token. the user attribute in openid must have the following names `bgw_rules` and `group_bgw_rules`. In Auth Server the rules are sent as a JSON array of strings while in open id the rules area a long string string separated by space for each rule.


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
