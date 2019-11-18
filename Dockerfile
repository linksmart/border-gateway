FROM node:12-alpine

ARG node_env=development
ENV NODE_ENV=$node_env

RUN mkdir /bgw && chown node:node /bgw

USER node

COPY --chown=node:node ./logger /bgw/logger
COPY --chown=node:node ./tracer /bgw/tracer
COPY --chown=node:node ./bgw-auth-service /bgw/bgw-auth-service
COPY --chown=node:node ./bgw-external-interface /bgw/bgw-external-interface
COPY --chown=node:node ./bgw-http-proxy /bgw/bgw-http-proxy
COPY --chown=node:node ./bgw-mqtt-proxy /bgw/bgw-mqtt-proxy
COPY --chown=node:node ./bgw-websocket-proxy /bgw/bgw-websocket-proxy
COPY --chown=node:node ./bgw.sh /bgw
COPY --chown=node:node ./package.json /bgw
WORKDIR /bgw
RUN chmod -R +rw /bgw

RUN npm install && \
    npm prune --production

RUN mkdir /bgw/test
COPY --chown=node:node ./test/*.js /bgw/test
RUN npm test

RUN chmod -R +x *.sh

EXPOSE 443 8883 9002

ENTRYPOINT ["./bgw.sh"]
CMD ["start"]
