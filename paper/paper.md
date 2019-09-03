---
title: 'LinkSmart Border Gateway: A single entry point into an Internet of Things autonomous system'
output:
  pdf_document:
    fig_caption: yes
tags:
  - JavaScript
  - Node.js
  - LinkSmart
  - Internet of Things
  - IoT
authors:
  - name: Jannis Warnat
    orcid: 0000-0002-8233-309X
    affiliation: 1
  - name: Mohammad Alhareeqi
    affiliation: 1
affiliations:
 - name: Fraunhofer Institute for Applied Information Technology (FIT)
   index: 1
date: 26 August 2019
bibliography: paper.bib
csl: chicago-author-date.csl
---

# Summary

An Internet of Things autonomous system (IoT AS) can be defined as a collection of connected devices and their supporting
services under the control of one or more system administrators on behalf of a single administrative entity or domain. A typical IoT AS (e.g. a home automation system) consists of sensors and/or actuators that are connected to device gateways which in turn are connected to services over REST APIs and/or an MQTT broker. It is a
challenging task to ensure that remote access over the Internet to any component of a such a heterogeneous system is only allowed in case the communication is properly encrypted, authenticated, authorized and accounted for [@bgw].

The 
system administrators could choose to allow access to the IoT AS only via VPN or through a firewall and leave additional
basic security measures (like authentication and authorization) to each component. HTTP REST APIs or WebSocket services could be protected using some kind of authentication proxy, e.g. nginx [@nginx] together with the lua-resty-openidc library [@resty]. Different MQTT broker implementations come with different, idiosyncratic security mechanisms (e.g. @mosquitto or @rabbitmq).

![Border Gateway architecture \label{arch}](figure.png)
 
To address security concerns for an IoT AS centrally, LinkSmart Border Gateway offers a single entry point into the system providing basic security mechanisms for all components behind it. It is implemented in Node.js JavaScript based on an extensible microservices architecture; see figure \ref{arch}. The microservices are described as follows:

* **External interface service** is the facade for the other Border Gateway microservices, allows only TLS-encrypted connections from outside the IoT AS on configurable ports and forwards valid requests to the proxy services (see below). Optionally, mutual TLS can be activated so that clients are authenticated using their X.509 certificates.
* **Auth service** is asked by the proxy services for a decision about whether a request is to be allowed or rejected for a specific user. The user credentials must be provided in an HTTP authorization header using basic authentication [@rfc7617] or bearer token [@rfc6750]. These are then authenticated against an OpenID Connect (OIDC) provider [@oidc] and authorized using an uncomplicated rule format (see below). The authorization rule definitions must be maintained as user attributes in the backend of the OIDC provider and need to be added as a custom claim to the provider's access tokens. The implementation of this is OIDC provider specific and has been tested and documented for Keycloak [@keycloak] and Auth0 [@auth0] (see @bgwdocs). Access tokens are being cached in a Redis database [@redis] for the duration of their lifespan.
* **HTTP proxy service** supports multiple ways to provide credentials for a request, notably basic authentication and bearer token in an HTTP authorization header. It asks the Auth service whether the request is allowed and either rejects the request or forwards it to the target service behind Border Gateway. The HTTP response is scanned for service or component addresses internal to the IoT AS which are then translated into external addresses to be accessible from outside Border Gateway.
* **MQTT proxy service** supports MQTT v3.1.1 [@mqtt]. Credentials can be provided in the standard fields username and password of an MQTT CONNECT package. It is also possible to provide an OIDC access token in the username field. Again, the Auth service is queried to decide whether to forward or reject the request.
* **WebSocket proxy service** allows providing user credentials as query parameters either as username / password (Base64-encoded) or OIDC access token. Auth service is queried for a decision whether to establish the connection to the target WebSocket application.  

The format of the authorization rules maintained in the OIDC provider's backend as user attributes is inspired by the usage of topic levels and wildcards in MQTT and allows the definition of authorization rules based on:

  * Protocol
  * Method (e.g. GET / POST for HTTP and PUB / SUB for MQTT)
  * Hostname
  * Port
  * Topic (in case of MQTT) / Path (in case of HTTP)
  
The rule ``HTTPS/GET/demo.linksmart.eu/443/example`` would allow the user GET-only access on endpoint ``https://demo.linksmart.eu/example`` while rule ``MQTT/+/mosquitto/1883/example`` would allow publication and subscription rights to topic ``example`` on an MQTT broker running at ``mosquitto:1883``. Note that authorization for the WebSocket proxy is currently only perfomed on connection establishment and not on the level of individual messages.

Border Gateway could be extended with additional proxy microservices to support additional protocols in a straightfoward manner.

The software has recently been deployed and improved in several Horizon 2020 research and innovation
projects funded by the European Union, namely in the domains smart city [@monica], manufacturing [@composition] and smart energy [@storage4grid].

# Acknowledgements

We acknowledge contributions from Raphael Ahrens, José Ángel Carvajal Soto and Farshid Tavakolizadeh during the design and development of this project.

# References


