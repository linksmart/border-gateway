FROM node:7.9-alpine

ENV REFRESHED_AT 2017-04-26

RUN apk add --no-cache git

# copy default config file and code
COPY *.js /home/
COPY *.json /home/
WORKDIR /home

RUN npm install

VOLUME /home
EXPOSE 5050

ENTRYPOINT ["npm", "run"]
CMD ["start"]
