FROM node:latest
#FROM node:7.9

COPY . /bgw
WORKDIR /bgw

EXPOSE 443 8883

ENTRYPOINT ["./bgw.sh"]
#CMD ["start"]
CMD ["start","enable_ei"]
