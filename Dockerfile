FROM node:latest
#FROM node:7.9

WORKDIR /bgw
RUN npm install

EXPOSE 443 8883

ENTRYPOINT ["./bgw.sh"]
#CMD ["start"]
CMD ["start","enable_ei"]
