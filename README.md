# Border Gateway

[![Docker Pulls](https://img.shields.io/docker/pulls/linksmart/bgw.svg)](https://hub.docker.com/r/linksmart/bgw/tags)
[![GitHub tag (latest SemVer)](https://img.shields.io/github/tag/linksmart/border-gateway.svg)](https://github.com/linksmart/border-gateway/tags)
[![Build Status](https://travis-ci.com/linksmart/border-gateway.svg)](https://travis-ci.com/linksmart/border-gateway)

The LinkSmart Border Gateway provides a single point of entry into an "Internet of Things"
autonomous system (IoT-AS) consisting of connected devices, their supporting services and the messaging infrastructure.
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
  (e.g. a request to https://iot.linksmart.eu/\<location\> can be forwarded to localhost or
  any other host protected by the Border Gateway on the correct port).
* Address translation for HTTP requests, i.e. internal IoT-AS addresses in HTTP responses can be
  translated to external addresses that the requester is able to connect to.

## Configuration and deployment 

See the [configuration page][Config].
See the [deplyoment page][Deploy].
 
Find the documentation here: https://docs.linksmart.eu/display/BGW

[Docker]:https://hub.docker.com/r/linksmart/bgw/tags
[Config]:docs/config.md
[Deploy]:docs/config.md

