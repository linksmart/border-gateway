FROM node:7.9-alpine

RUN apk add --no-cache g++ make python git

WORKDIR /bgw
RUN git clone https://github.com/hareeqi/iot-bgw.git .
RUN npm install

VOLUME /bgw/config /bgw/dev
EXPOSE 443

ENTRYPOINT ["bash", "-c", "trap 'npm run stop' INT && npm run"]
CMD ["start"]
