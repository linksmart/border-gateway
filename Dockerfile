FROM node:7.9-alpine

RUN apk add --no-cache g++ make python git


RUN git clone https://github.com/hareeqi/iot-bgw.git bgw
RUN cd bgw && npm install

VOLUME /bgw /bgw/config
EXPOSE 80 443 8883

WORKDIR /bgw

ENTRYPOINT ["sh", "docker.sh"]
CMD [""]
