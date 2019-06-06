# Border Gateway

[![Docker Pulls](https://img.shields.io/docker/pulls/linksmart/bgw.svg)](https://hub.docker.com/r/linksmart/bgw/tags)
[![Build Status](https://travis-ci.com/linksmart/border-gateway.svg)](https://travis-ci.com/linksmart/border-gateway)

The LinkSmart® Border Gateway provides a single point of entry into an "Internet of Things"
autonomous system (IoT-AS) consisting of connected devices, their supporting services and the messaging infratrukture.
These are the main functionalities:

* TLS offloading at the edge of the protected autonomous system
  (HTTPS, TLS-encrypted MQTT and TLS-encrypted WebSocket).
* Authentication and authorization for HTTP, MQTT and WebSocket requests.
  Users and their permissions can be defined using an Identity Provider conforming to
  the OpenID Connect protocol.
* Access control for HTTP requests can be defined for the type of protocol (HTTP or HTTPS),
  requested resources (or paths) and allowed HTTP methods.
* Access control for MQTT requests can be defined for topics, wildcards, and MQTT commands
  (publish, subscribe etc.).
* Access control for WebSocket connections can be defined for hostnames and ports.
* HTTP request forwarding to internal services according to location definitions
  (e.g. a request to https://iot.linksmart.eu/<location> can be forwarded to localhost or
  any other host protected by the Border Gateway on the correct port).
* Address translation for HTTP requests, i.e. internal IoT-AS addresses in HTTP responses can be
  translated to external addresses, which the requester is able to connect to.

## Deployment

The Border Gateway can be easily deployed via [Docker container][Docker]. The basic configuration
requires a certificate for the host and an available OpenID Connect provider.

### Set up OpenID Connect provider

Set up an OpenID Connect authentication provider (e.g.
[Keycloak](https://www.keycloak.org/) as a local deployment
or [Auth0](https://auth0.com/) a a cloud service). See
[subpage](https://docs.linksmart.eu/display/BGW/Setting+up+Keycloak+as+an+OpenID+Connect+provider)for
an example on how to set up Keycloak as an Open ID provider for the
Border Gateway.

### Create an SSL certificate for your deployment

Options could be Let´s encrypt or Fraunhofer certificates. You will need
the two .pem files containing the certificate itself (including chain)
and the private key. See below on how to provide the necessary
information in a config file.

### Create config file

Create a file config.toml with the following entries:

     [external-interface]
     tls_key = "/bgw/certs/<your_key>.pem"
     tls_cert = "/bgw/certs/<your_cert>.pem"

     [mqtt-proxy]

       [mqtt-proxy.broker]
       address = "demo.linksmart.eu"
       port = 8883.0
       username = "linksmart"
       password = "demo"
       tls = true
       tls_ca = ""
       tls_client_key = ""
       tls_client_cert = ""

     [http-proxy]
       [http-proxy.domains]
         [http-proxy.domains."<your_domain_name_used_in_certificate>"]
           [http-proxy.domains."<your_domain_name_used_in_certificate>
 "."<location>"]
           local_address = "<address_of_your_local_service>:<port>"
     [auth-service]
       [auth-service.openid_connect_providers]
         [auth-service.openid_connect_providers.default]
         issuer = "https://auth.fit.fraunhofer.de/kc/realms/bgw-jannis
 -local"
         authorization_endpoint = "https://auth.fit.fraunhofer.de/kc/r
 ealms/linksmart-demo/protocol/openid-connect/auth"
         token_endpoint = "https://auth.fit.fraunhofer.de/kc/realms/li
 nksmart-demo/protocol/openid-connect/token"
         audience = "bgw_client"
         client_id = "bgw_client"
         client_secret = ""
         jwks_uri = "https://auth.fit.fraunhofer.de/kc/realms/linksmar
 t-demo/protocol/openid-connect/certs"
         realm_public_key_modulus = "y1lGnR7-Smc6qPxl7D4OxNX60T0UVkZu7
 O6xn4m-4QaTsweI1kgHqN8GB1ooPSQr6THNnjmIcHpMVxL4THncpaHpXn-8vMN6mKxiD6
 MPPdOUO7NpZEZpeUxvPdyLSaL5Vs3k-c2X1uQ7nphr1ZXN0SmhgARY73rMK5aAL_gjvK3
 EGqZUzeeakZdIOuWjxO58Z6HkarQLVJ6bXfM8dfUKksJp7rGK-4YBccjdnbBssb_3EsQY
 FnoeDXHWTgu8NiKEsyI6JRtbbbeV_ZlKAHMZhdN6NUInS35tvw0VX2tK5TiASihN4VyaL
 a17dQ3988HkSLU1d2niIcKyW--ykjDnzQ"
         realm_public_key_exponent = "AQAB"
         redirect_uri = "https://<your_domain_name_used_in_certificate
 >:443/callback"
         anonymous_bgw_rules = "HTTPS/GET/# MQTT/#"

Note that anonymous access is limited to read-only for HTTP to start
with. Full anonymous access to MQTT is granted. Find out more about
authentication and authorization in the dedicated section.

### Start Docker container

Run the Border Gateway with docker-compose. Make sure the .pem files and
the config.json is available, e.g.:

     version: '3.5'
     services:
       bgw:
         image: "linksmart/bgw:latest"
         container_name: "bgw"
         ports:
           - 443:443
           - 8883:8883
           - 9002:9002
         volumes:
           - "<path_to_your_config_folder>:/bgw/config"
           - "<path_to_your_certs_folder>:/bgw/certs"

### Optional: Set up Redis as an access token cache

You can use key-value database [Redis](https://hub.docker.com/_/redis)
to cache access tokens for connections using username / password.
Without caching, each request to one of your services will lead to a
post a request to the OpenID Connect provider to retrieve an access
token containing the authorization rules. Caching may speed things up.
You can add a Redis instance to your Docker deployment by extending your
docker-compose file like this:

     version: '4.5'
     services:
       bgw:
         image: "linksmart/bgw:latest"
         container_name: "bgw"
         ports:
           - 443:443
           - 8883:8883
           - 9002:9002
         volumes:
           - "<path_to_your_config_folder>:/bgw/config"
           - "<path_to_your_certs_folder>:/bgw/certs"
       redis:
         container_name: redis
         image: redis:5-alpine

Add this to your config.toml (by default, Redis support is not enabled):

     [auth-service]
     redis_expiration = 120
     redis_host = redis
     redis_port = 6379

The BGW auth service will store keys and values in Redis like this:

-   Key: SHA256 hash of string `token_endpoint + username + password`
-   Value: Access token encrypted using AES-256 with the user password
    as symmetric key
-   Key and value automatically expire after the number of seconds
    defined in `auth_service_redis_expiration`

If `auth_service_redis_expiration` is set to a value greater 0 the BGW auth
service will always try to get an access token from Redis first before
posting a request to the OpenID Connect provider. Make sure that the
value `auth_service_redis_expiration` is not higher than the configured
lifespan of the access tokens!

## Configuration

See the [configuration page][Config].
 


Find the documentation here: https://docs.linksmart.eu/display/BGW

[Docker]:https://hub.docker.com/r/linksmart/bgw/tags
[Config]:docs/config.md
