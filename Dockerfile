FROM node:7.9-alpine

RUN apk add --no-cache g++ make python git bash

WORKDIR /bgw
RUN git clone https://github.com/hareeqi/iot-bgw.git .
RUN npm install

VOLUME /bgw/config /bgw/dev
EXPOSE 443

ENTRYPOINT ["docker.sh"]
CMD ["start"]
