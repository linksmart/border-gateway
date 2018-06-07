FROM node:latest
#FROM node:7.9

WORKDIR /bgw
RUN git clone https://code.linksmart.eu/scm/bgw/iot-bgw.git .
RUN git checkout -b dev origin/dev
RUN npm install

EXPOSE 80 443 8883

ENTRYPOINT ["./bgw.sh"]
#CMD ["start"]
CMD ["start","enable_ei"]
