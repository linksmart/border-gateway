FROM node:7.9

WORKDIR /bgw
RUN git clone https://github.com/hareeqi/iot-bgw.git .
RUN npm install

EXPOSE 80 443 8883

ENTRYPOINT ["sh", "bgw.sh"]
CMD: ["forever"]
