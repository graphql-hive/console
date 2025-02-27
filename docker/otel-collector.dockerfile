FROM golang:1.23.7-bookworm AS builder

ARG OTEL_VERSION=0.122.0

WORKDIR /build

RUN go install go.opentelemetry.io/collector/cmd/builder@v${OTEL_VERSION}

# Copy the manifest file and other necessary files
COPY --from=config builder-config.yaml .

# Build the custom collector
RUN builder --config=/build/builder-config.yaml

# Stage 2: Final Image
FROM alpine:3.14

WORKDIR /app

# Copy the generated collector binary from the builder stage
COPY --from=builder /build/otelcol-custom .

# Expose necessary ports
EXPOSE 4317/tcp 4318/tcp 13133/tcp

# Set the default command
CMD ["./otelcol-custom", "--config=/etc/otel-config.yaml"]
