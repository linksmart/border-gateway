---
title: 'Border Gateway: A single entry point into an IoT autonomous network'
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
bibliography: ./paper.bib
# csl: ./ieee-internet-of-things-journal.csl
---

# Summary

The system architecture of an Internet of Things (IoT) application typically comprises
multiple devices, device gateways and services communicating through a variety of protocols. It is a
challenging task to ensure that remote access to any system component is only allowed
in case the communication is properly encrypted, authenticated, authorized and accounted for [@bgw].
 
Border Gateway offers a single entry point into a local IoT network using
an extensible micro services architecture implemented in Node.js JavaScript. Currently the widely used protocols HTTP,
MQTT v3.1.1 [@mqtt] and WebSocket [@rfc6455] are supported. Border Gateway only allows TLS-encrypted connections, authenticates
each connection attempt against an OpenID Connect provider [@oidc], performs a more fine-grained authorization
using a simple rule format [@bgwdocs] and eventually forwards the request to the target service in the protected IoT
network.

The software has recently been deployed and improved in several Horizon 2020 research and innovation
projects funded by the European Union, see @monica, @composition and @storage4grid.

# Figures

![](./figure.png)

# Acknowledgements

We acknowledge contributions from Raphael Ahrens, José Ángel Carvajal Soto, and Farshid Tavakolizadeh during the design and development of this project.

# References