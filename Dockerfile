FROM node:7.9

WORKDIR /bgw
RUN git clone https://code.linksmart.eu/scm/bgw/iot-bgw.git#bugfix/LS-240 .
RUN npm install

EXPOSE 80 443 8883

ENTRYPOINT ["./bgw.sh"]
CMD ["start"]
