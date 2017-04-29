FROM node:7.9-alpine

RUN apk add --no-cache g++ make python git

COPY . /home
WORKDIR /home
RUN npm install

VOLUME /config
EXPOSE 443

ENTRYPOINT ["npm"]
CMD ["start"]
