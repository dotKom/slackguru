FROM node:7-alpine
MAINTAINER dotkom@online.ntnu.no

ENV NODE_ENV=production

ENV APP=/srv/app
RUN mkdir -p $APP
WORKDIR $APP

COPY package.json .
RUN npm install && npm cache clean

COPY . .

CMD ["/srv/app/bin/hubot", "--adapter", "slack"]
