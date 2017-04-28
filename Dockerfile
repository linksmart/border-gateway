FROM node:7.9

#RUN apk add --no-cache git python make
RUN apt install git

RUN git clone https://github.com/hareeqi/iot-bgw.git
WORKDIR iot-bgw
RUN npm install

VOLUME /config
EXPOSE 443

CMD npm start
