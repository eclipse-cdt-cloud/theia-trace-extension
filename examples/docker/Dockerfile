FROM node:16.20.2-bookworm-slim as build

RUN apt-get update && apt-get install -y \
    git \
    python3 \
    make \
    pkg-config \
    libsecret-1-dev \
    g++ \
    libx11-dev \
    libxkbfile-dev

# Build the browser theia-trace-extension application
COPY example-package.json /app/tte/package.json
WORKDIR /app/tte/
RUN yarn && \
    npx theia build --app-target=\"browser\" --mode development && \
    yarn autoclean --init && \
    echo *.ts >> .yarnclean && \
    echo *.ts.map >> .yarnclean && \
    echo *.spec.* >> .yarnclean && \
    yarn cache clean

FROM node:16.20.2-bookworm-slim

COPY --from=build /app/tte /app/tte

RUN apt-get update && apt-get install -y \
    libx11-6 \
    libxkbfile1 \
    libsecret-1-0 \
    && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV production

WORKDIR /app/tte
COPY docker-entrypoint.sh /usr/local/bin
EXPOSE 4000
ENTRYPOINT ["docker-entrypoint.sh"]
