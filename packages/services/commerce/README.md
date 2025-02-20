# `@hive/commerce`

This service takes care of commerce part of Hive Cloud.

## Configuration

| Name                                | Required | Description                                                                                              | Example Value                                        |
| ----------------------------------- | -------- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `PORT`                              | No       | The port this service is running on.                                                                     | `4001`                                               |
| `ENVIRONMENT`                       | No       | The environment of your Hive app. (**Note:** This will be used for Sentry reporting.)                    | `staging`                                            |
| `SENTRY_DSN`                        | No       | The DSN for reporting errors to Sentry.                                                                  | `https://dooobars@o557896.ingest.sentry.io/12121212` |
| `SENTRY`                            | No       | Whether Sentry error reporting should be enabled.                                                        | `1` (enabled) or `0` (disabled)                      |
| `PROMETHEUS_METRICS`                | No       | Whether Prometheus metrics should be enabled                                                             | `1` (enabled) or `0` (disabled)                      |
| `PROMETHEUS_METRICS_LABEL_INSTANCE` | No       | The instance label added for the prometheus metrics.                                                     | `usage-service`                                      |
| `PROMETHEUS_METRICS_PORT`           | No       | Port on which prometheus metrics are exposed                                                             | Defaults to `10254`                                  |
| `REQUEST_LOGGING`                   | No       | Log http requests                                                                                        | `1` (enabled) or `0` (disabled)                      |
| `LOG_LEVEL`                         | No       | The verbosity of the service logs. One of `trace`, `debug`, `info`, `warn` ,`error`, `fatal` or `silent` | `info` (default)                                     |
| `OPENTELEMETRY_COLLECTOR_ENDPOINT`  | No       | OpenTelemetry Collector endpoint. The expected traces transport is HTTP (port `4318`).                   | `http://localhost:4318/v1/traces`                    |
