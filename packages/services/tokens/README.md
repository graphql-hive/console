# `@hive/tokens`

This service takes care of validating and issuing tokens used for accessing the public facing hive
APIs (usage service and GraphQL API).

## Configuration

| Name                                 | Required | Description                                                                                              | Example Value                                        |
| ------------------------------------ | -------- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `PORT`                               | **Yes**  | The port this service is running on.                                                                     | `6001`                                               |
| `POSTGRES_HOST`                      | **Yes**  | Host of the postgres database                                                                            | `127.0.0.1`                                          |
| `POSTGRES_PORT`                      | **Yes**  | Port of the postgres database                                                                            | `5432`                                               |
| `POSTGRES_DB`                        | **Yes**  | Name of the postgres database.                                                                           | `registry`                                           |
| `POSTGRES_USER`                      | **Yes**  | User name for accessing the postgres database.                                                           | `postgres`                                           |
| `POSTGRES_PASSWORD`                  | No       | Password for accessing the postgres database.                                                            | `postgres`                                           |
| `POSTGRES_SSL`                       | No       | Whether the postgres connection should be established via SSL.                                           | `1` (enabled) or `0` (disabled)                      |
| `REDIS_HOST`                         | **Yes**  | The host of your redis instance.                                                                         | `"127.0.0.1"`                                        |
| `REDIS_PORT`                         | **Yes**  | The port of your redis instance.                                                                         | `6379`                                               |
| `REDIS_PASSWORD`                     | **Yes**  | The password of your redis instance.                                                                     | `"apollorocks"`                                      |
| `REDIS_TLS_ENABLED`                  | **No**   | Enable TLS for redis connection (rediss://).                                                             | `"0"`                                                |
| `ENVIRONMENT`                        | No       | The environment of your Hive app. (**Note:** This will be used for Sentry reporting.)                    | `staging`                                            |
| `SENTRY`                             | No       | Whether Sentry error reporting should be enabled.                                                        | `1` (enabled) or `0` (disabled)                      |
| `SENTRY_DSN`                         | No       | The DSN for reporting errors to Sentry.                                                                  | `https://dooobars@o557896.ingest.sentry.io/12121212` |
| `PROMETHEUS_METRICS`                 | No       | Whether Prometheus metrics should be enabled                                                             | `1` (enabled) or `0` (disabled)                      |
| `PROMETHEUS_METRICS_LABEL_INSTANCE`  | No       | The instance label added for the prometheus metrics.                                                     | `tokens`                                             |
| `PROMETHEUS_METRICS_PORT`            | No       | Port on which prometheus metrics are exposed                                                             | Defaults to `10254`                                  |
| `REQUEST_LOGGING`                    | No       | Log http requests                                                                                        | `1` (enabled) or `0` (disabled)                      |
| `LOG_LEVEL`                          | No       | The verbosity of the service logs. One of `trace`, `debug`, `info`, `warn` ,`error`, `fatal` or `silent` | `info` (default)                                     |
| `OPENTELEMETRY_COLLECTOR_ENDPOINT`   | No       | OpenTelemetry Collector endpoint. The expected traces transport is HTTP (port `4318`).                   | `http://localhost:4318/v1/traces`                    |
| `OPENTELEMETRY_TRACE_USAGE_REQUESTS` | No       | If enabled, requests send to this service from `usage` service will be monitored with OTEL.              | `1` (enabled, or ``)                                 |
