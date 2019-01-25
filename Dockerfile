FROM node:latest

COPY ./bgw-aaa-client /bgw/bgw-aaa-client
COPY ./bgw-auth-service /bgw/bgw-auth-service
COPY ./bgw-external-interface /bgw/bgw-external-interface
COPY ./bgw-http-proxy /bgw/bgw-http-proxy
COPY ./bgw-mqtt-proxy /bgw/bgw-mqtt-proxy
COPY ./bgw-rabbitmq-auth-backend-http /bgw/bgw-rabbitmq-auth-backend-http
COPY ./bgw-websocket-proxy /bgw/bgw-websocket-proxy
COPY ./bgw.sh /bgw
COPY ./json2env.js /bgw
COPY ./package.json /bgw

WORKDIR /bgw
RUN npm install

EXPOSE 443 8883 9002

ENTRYPOINT ["./bgw.sh"]
CMD ["start"]
