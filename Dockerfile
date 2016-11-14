FROM node:7-alpine
MAINTAINER dotkom@online.ntnu.no

ENV APP=/srv/app
RUN mkdir -p $APP
WORKDIR $APP

COPY package.json .
RUN npm install

COPY . .

CMD ["/srv/app/bin/hubot", "--adapter", "slack"]
