ARG NODE_VERSION_TAG
FROM node${NODE_VERSION_TAG}

# Changes daily (set by docker.hcl) so this layer is not reused from the build cache indefinitely.
ARG APT_UPGRADE_CACHE_BUST
RUN echo "apt upgrade: $APT_UPGRADE_CACHE_BUST" && apt-get update && apt-get upgrade -y && apt-get install -y --no-install-recommends ca-certificates git && rm -rf /var/lib/apt/lists/*

ARG CLI_VERSION

WORKDIR /usr/src/app

RUN npm install --global @graphql-hive/cli@${CLI_VERSION} \
  && rm -rf /usr/local/lib/node_modules/npm \
    /usr/local/lib/node_modules/corepack \
    /opt/yarn-v* \
    /usr/local/bin/npm \
    /usr/local/bin/npx \
    /usr/local/bin/corepack \
    /usr/local/bin/yarn \
    /usr/local/bin/yarnpkg

LABEL org.opencontainers.image.licenses=MIT
LABEL org.opencontainers.image.title=$IMAGE_TITLE
LABEL org.opencontainers.image.version=$RELEASE
LABEL org.opencontainers.image.description=$IMAGE_DESCRIPTION
LABEL org.opencontainers.image.authors="The Guild"
LABEL org.opencontainers.image.vendor="Kamil Kisiela"
LABEL org.opencontainers.image.url="https://github.com/graphql-hive/platform"
LABEL org.opencontainers.image.source="https://github.com/graphql-hive/platform"

ENV ENVIRONMENT=production
ENV RELEASE=$RELEASE
RUN hive --version

ENTRYPOINT ["hive"]
