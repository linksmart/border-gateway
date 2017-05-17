FROM node:7.9-alpine

RUN apk add --no-cache g++ make python git

WORKDIR /bgw
RUN git clone https://github.com/hareeqi/iot-bgw.git .
RUN npm install

EXPOSE 80 443 8883

ENTRYPOINT ["sh", "docker.sh"]
CMD [""]
