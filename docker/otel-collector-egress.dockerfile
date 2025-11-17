FROM golang:1.25-bookworm AS builder

ARG OTEL_VERSION=0.140.0

WORKDIR /build

RUN go install go.opentelemetry.io/collector/cmd/builder@v${OTEL_VERSION}

# Copy the manifest file
COPY builder-config-egress.yaml builder-config.yaml

# Build the custom collector
RUN CGO_ENABLED=0 builder --config=/build/builder-config.yaml

# Stage 2: Final Image
FROM alpine:3.14

WORKDIR /app

# Copy the generated collector binary from the builder stage
COPY --from=builder /build/otelcol-custom .
COPY config-egress.yaml /etc/otel-config.yaml

# Expose necessary ports
EXPOSE 4317/tcp 4318/tcp 13133/tcp

# Set the default command
CMD ["./otelcol-custom", "--config=/etc/otel-config.yaml"]
