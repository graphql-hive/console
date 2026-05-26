FROM node:24.14.1-slim

RUN apt-get update && apt-get install -y ca-certificates

ARG INSTALL_RDS_CA_CERTS=0
RUN if [ "$INSTALL_RDS_CA_CERTS" = "1" ]; then \
			apt-get update && apt-get install -y wget && \
			wget -q -O /usr/local/share/ca-certificates/aws-rds-global-bundle.pem https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem && \
			chmod 644 /usr/local/share/ca-certificates/aws-rds-global-bundle.pem && \
			update-ca-certificates && \
			apt-get purge -y --auto-remove wget && \
			rm -rf /var/lib/apt/lists/*; \
		fi

WORKDIR /usr/src/app

COPY --from=dist . /usr/src/app/
COPY --from=shared . /

ENV ENVIRONMENT=production
ENV NODE_ENV=production
ENV RELEASE=$RELEASE

LABEL org.opencontainers.image.licenses=MIT
LABEL org.opencontainers.image.title=$IMAGE_TITLE
LABEL org.opencontainers.image.version=$RELEASE
LABEL org.opencontainers.image.description=$IMAGE_DESCRIPTION
LABEL org.opencontainers.image.authors="The Guild"
LABEL org.opencontainers.image.vendor="Kamil Kisiela"
LABEL org.opencontainers.image.url="https://github.com/graphql-hive/platform"
LABEL org.opencontainers.image.source="https://github.com/graphql-hive/platform"

ENTRYPOINT [ "/entrypoint.sh" ]
