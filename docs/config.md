# Border Gateway Configuration
* All configuration parameters for the Border Gateway can be set as environment variables
* It is recommended to supply the environment variables via a file config.json. These parameters will be converted to environment variables and passed to all components in bgw.sh.
* Each component has a config prefix (**EI_, HTTP_PROXY_, MQTT_PROXY_, AUTH_SERVER_, AAA_CLIENT_**)
* Shared configuration parameter like the parameters for the AAA client can be defined globally like AAA_CLIENT_ or selectively for each component like EI_AAA_CLIENT_

# Table of Contents
* [Global Configuration](#global)
* [MQTT Proxy](#MQTT)
* [WebSocket Proxy](#WebSocket)
* [HTTP Proxy](#HTTP)
* [External Interface](#EI)
* [AAA Client](#AAA)
* [Open ID](#OpenID)
* [User Access Rules](#rules)
<a name="global"></a>
## Global Configuration
```
EXTERNAL_DOMAIN=linksmart-dev.fit.fraunhofer.de
```
The external domain name
```
TLS_CERT=/certs/linksmart-dev.fit.fraunhofer.de_cert_with_chain.pem
```
File path to the TLS certificate
```
TLS_KEY=/certs/linksmart-dev.fit.fraunhofer.de_sec_key.pem
```
File path to the TLS key
<a name="MQTT"></a>
## MQTT Proxy
```
MQTT_PROXY_BIND_ADDRESSES=[127.0.0.1]
```
The default bind address for MQTT Proxy is `127.0.0.1` when external interface is enabled.
```
MQTT_PROXY_BIND_PORT=5051
```
The usual bind port for MQTT proxy is `5051` when external interface is enabled. Without external interface you probably should use MQTT standard port `1883`.
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
MQTT_PROXY_BROKER={"address":"localhost","port":1883,"username":"","password":"","tls":false,"tls_ca": "","tls_client_key":"","tls_client_cert":""}
```
The upstream broker information encoded in JSON. You can connect to a broker with username and password and provide a certificate authority and client certificates.
<a name="WebSocket"></a>
## WebSocket Proxy
```
WEBSOCKET_PROXY_BIND_ADDRESSES=[127.0.0.1]
```
The default bind address for WebSocket proxy is `127.0.0.1` when external interface is enabled.
```
WEBSOCKET_PROXY_BIND_PORT=5052
```
The usual bind port for WebSocket proxy is 5052 when external interface is enabled.
<a name="HTTP"></a>
## HTTP Proxy
```
HTTP_PROXY_BIND_ADDRESSES=[127.0.0.1]
```
The default bind address for WebSocket proxy is `127.0.0.1` when external interface is enabled.
```
HTTP_PROXY_BIND_PORT=5050
```
The usual bind port for HTTP proxy is `5050` when external interface is enabled. Without external interface you probably should use HTTP standard port `80`.
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
HTTP_PROXY_OVERRIDE_AUTHORIZATION_HEADER=""
```
Insert an authorization header to all HTTP requests forwarded through the BGW HTTP Proxy. Useful for internal auth
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
Aliases are the most critical config in the HTTP Proxy. Its value is a JSON encoded string that allows you to define short names for internal services to be accessible from outside instead of using encoded long URLs. Each alias can be defined with the following properties:
  * **local_address:** "http://saar:8081"
  * **override_authorization_header:** ""
  * **change_origin_on:** {"https_req":false,"http_req":false}
  * **translate_local_addresses:** {"enabled":false, "whitelist":["\*.ietf.org"]}
  * **insecure:** false
  * **use_basic_auth:** false
Translation allows you to encode all URLs in the HTTP response of this alias to base64 and enables it to be accessible from outside. White-listing of translation allows you to exclude certain domains from the translation. The insecure flag disables the checking of a TLS validity of an internal address. Basic auth allows you enable user name and password prompts on any internal website.
<a name="EI"></a>
## External Interface
```
HTTP_EXTERNAL_INTERFACE_BIND_ADDRESSES=["0.0.0.0"]
```
The default bind address for the External Interface for https connections is `0.0.0.0`.
```
HTTP_EXTERNAL_INTERFACE_BIND_PORT=443
```
The default bind port for the External Interface for https connections is 443.
```
MQTT_EXTERNAL_INTERFACE_BIND_ADDRESSES=["0.0.0.0"]
```
The default bind address for the External Interface for secure mqtt connections is `0.0.0.0`.
```
MQTT_EXTERNAL_INTERFACE_BIND_PORT=8883
```
The default bind port for the External Interface for secure mqtt connections is 8883.
```
WEBSOCKET_EXTERNAL_INTERFACE_BIND_ADDRESSES=["0.0.0.0"]
```
The default bind address for the External Interface for secure WebSocket connections is `0.0.0.0`.
```
WEBSOCKET_EXTERNAL_INTERFACE_BIND_PORT=9002
```
The default bind port for the External Interface for secure Websocket connections is 9002.
```
EI_REQUEST_CLIENT_CERT=false
```
When set to true clients connecting to the BGW have to authenticate themselves with a client certificate.
```
EI_CLIENT_CA_PATH=""
```
File path to the certificate authority for client certificates
```
EI_ENABLE_ALPN_MODE=""
```
Allows running multiple protocols on the same port using the TLS ALPN extension.
```
EI_ENABLE_SNI_MODE=""
```
Allows running multiple protocols on the same port using sub-domains available in the TLS SNI extension.
```
EI_SERVERS=[{"name":"http_proxy"....},{"name":"mqtt_proxy"....}]
```
A JSON string indicates the BGW components that the external interface is forwarding to; by default it only forwards HTTPS, secure MQTT and secure WebSocket connections to the respective proxy. Each internal BGW component can have the following properties:
* **name:** "http_proxy"
* **bind_addresses:**  ["0.0.0.0"]
* **bind_port:** 443
* **dest_port:** 5050
* **dest_address:** "127.0.0.1"
The name property is also used for the ALPN mode.
<a name="AAA"></a>
## AAA Client
The AAA Client the component shared among all BGW services providing authentication, authorization and accounting. All configuration parameters below can be limited to a certain component by providing the component prefix i.e `HTTP_PROXY_`
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
Your logging service doesn't provide a timestamps, this will generate one
<a name="OpenID"></a>
## Open ID
These need to be set to provide Open ID Connect integration (e.g. via Keycloak)
```
AAA_CLIENT_AUTH_PROVIDER=openid
```
Setting auth provider to `openid`
```
AAA_CLIENT_HOST=https://auth.fit.fraunhofer.de/kc/realms/<realm_name>
```
The openid provider URL
```
AAA_CLIENT_OPENID_CLIENTID=bgw_client
```
Open id client id
```
AAA_CLIENT_OPENID_CLIENTSECRET=""
```
The openid client secret
```
AAA_CLIENT_OPENID_GRANT_TYPE="password"
```
The BGW supports four ways to integrate with OpenID Connect:
  * **`password`:** Username and password are provided in each HTTP(S) or MQTT request.
  * **`access_token` (recommended):** An OpenID Connect access token is provided with every HTTP(S) request (Authorization: Bearer) or given as username in an MQTT request. The token is validated by the Border Gateway.
  * **`refresh_token`:** Expiration time for refresh_token is configured in Keycloak Realm settings (Tokens / SSO Session Idle). Here is an example on how to obtain a refresh token: `curl -d "client_id=<$AAA_CLIENT_OPENID_CLIENTID>" -d "username=linksmart" -d "password=demo" -d "grant_type=password" -L "https://auth.fit.fraunhofer.de/kc/realms/<name_of_your_realm>/protocol/openid-connect/token"`. The value of field `refresh_token` can then be used to authorize http requests (Authorization: Bearer) or give it as username in an mqtt request.
  * **`authorization_code`:** Your Keycloak client needs to have "Standard Flow Enabled" button on and the list of "Valid Redirect URIs" needs to include the value of `AAA_CLIENT_HOST`. Here is an example on how to obtain an authorization code: Put `https://auth.fit.fraunhofer.de/kc/realms/<name_of_your_realm>/protocol/openid-connect/auth?client_id=<$AAA_CLIENT_OPENID_CLIENTID>&response_type=code&redirect_uri=https%3A%2F%2Fauth.fit.fraunhofer.de%2Fkc%2Frealms%2F<name_of_your_realm>` into your browser and log in with username and password. Copy the value of field `code` from the URL and use it in the same way as a refresh token. The code can be used only once!
```
AAA_CLIENT_OPENID_ANONYMOUS_USER=anonymous
```
User name for an profile designated for anonymous users used when a request does not provide any credentials. This is important if you want some internal services to be accessible without authentication and authorization.
```
AAA_CLIENT_OPENID_ANONYMOUS_PASS=anonymous
```
The password for the anonymous user.
<a name="rules"></a>
## User Access Rules
Rules are defined using user/group attributes in the OpenID Connect provider and then included in the access token. The user attribute in OpenID must be named `bgw_rules` and `group_bgw_rules`.
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
