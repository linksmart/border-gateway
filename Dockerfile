FROM node:10

COPY ./logger /bgw/logger
COPY ./bgw-auth-service /bgw/bgw-auth-service
COPY ./bgw-external-interface /bgw/bgw-external-interface
COPY ./bgw-http-proxy /bgw/bgw-http-proxy
COPY ./bgw-mqtt-proxy /bgw/bgw-mqtt-proxy
COPY ./bgw-configuration-service /bgw/bgw-configuration-service
COPY ./bgw-websocket-proxy /bgw/bgw-websocket-proxy
COPY ./bgw.sh /bgw
COPY ./package.json /bgw

WORKDIR /bgw
RUN npm install

EXPOSE 443 8883 9002

ENTRYPOINT ["./bgw.sh"]
CMD ["start"]
