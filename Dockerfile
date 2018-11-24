FROM node:latest

COPY . /bgw
WORKDIR /bgw
RUN npm install

EXPOSE 443 8883

ENTRYPOINT ["./bgw.sh"]
CMD ["start"]
