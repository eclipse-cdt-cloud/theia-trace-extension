FROM node:16-alpine

RUN mkdir /home/app
WORKDIR /home/app

RUN apk add --no-cache bash git python3 make pkgconfig libsecret-dev g++
# Use "bash" as replacement for "sh"
RUN rm /bin/sh && ln -s /bin/bash /bin/sh

# Build the browser theia-trace-extension application
COPY example-package.json /home/app/package.json
RUN npx yarn

COPY startup.sh /home/app
RUN ["chmod", "+x", "/home/app/startup.sh"]

# Start the service
ENTRYPOINT ["/home/app/startup.sh"]
