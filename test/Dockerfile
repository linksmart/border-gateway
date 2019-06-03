FROM debian:jessie-slim

RUN apt-get update && apt-get install -y curl jq

RUN apt-get install -y apt-transport-https ca-certificates curl gnupg2 software-properties-common
RUN curl -fsSL https://download.docker.com/linux/debian/gpg | apt-key add -
RUN add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/debian $(lsb_release -cs) stable"
RUN apt-get update
RUN apt-get -y install docker-ce

RUN curl -L "https://github.com/docker/compose/releases/download/1.23.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
RUN chmod +x /usr/local/bin/docker-compose

RUN curl -sL https://deb.nodesource.com/setup_10.x | bash -
RUN apt-get install -y nodejs

RUN curl -fsSL http://repo.mosquitto.org/debian/mosquitto-repo.gpg.key | apt-key add -
RUN add-apt-repository "deb https://repo.mosquitto.org/debian jessie main"
RUN apt-get update
RUN apt-get install -y mosquitto-clients

RUN npm install -g newman


