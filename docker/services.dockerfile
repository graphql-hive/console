FROM node:24.14.1-slim

RUN apt-get update && apt-get install -y wget ca-certificates && rm -rf /var/lib/apt/lists/*

ARG INSTALL_RDS_CA_CERTS=0
RUN if [ "$INSTALL_RDS_CA_CERTS" = "1" ]; then \
      wget -q -O /usr/local/share/ca-certificates/aws-rds-global-bundle.pem https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem && \
      chmod 644 /usr/local/share/ca-certificates/aws-rds-global-bundle.pem && \
      update-ca-certificates; \
    fi

ARG SERVICE_DIR_NAME
WORKDIR /usr/src/app/$SERVICE_DIR_NAME

COPY --from=dist . /usr/src/app/$SERVICE_DIR_NAME/
COPY --from=shared . /

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
ENV PORT=$PORT

HEALTHCHECK --interval=5s \
  --timeout=5s \
  --start-period=5s \
  --retries=6 \
  CMD $HEALTHCHECK_CMD

ENTRYPOINT [ "/entrypoint.sh" ]
