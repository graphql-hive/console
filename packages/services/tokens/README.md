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
| `REDIS_PASSWORD`                     | No       | The password of your redis instance.                                                                     | `"apollorocks"`                                      |
| `REDIS_TLS_ENABLED`                  | **No**   | Enable TLS for redis connection (rediss://).                                                             | `"0"`                                                |
| `REDIS_USERNAME`                     | No       | The username for Redis Access Control List authentication.                                               | `"default"`                                          |
| `REDIS_CLUSTER_MODE_ENABLED`         | No       | Enable Redis Cluster mode.                                                                               | `1` (enabled) or `0` (disabled)                      |
| `AWS_REGION`                         | No       | The global AWS region for the service. Used as the default region for AWS connections.                   | `us-east-1`                                          |
| `REDIS_AWS_IAM_AUTH_ENABLED`         | No       | Enable AWS IAM authentication for Redis (requires `AWS_REGION`).                                         | `1` (enabled) or `0` (disabled)                      |
| `REDIS_AWS_REGION`                   | No       | AWS region for IAM auth. Falls back to `AWS_REGION`.                                                     | `us-east-1`                                          |
| `REDIS_AWS_IAM_CACHE_NAME`           | No       | ElastiCache cache name (required if `REDIS_AWS_IAM_AUTH_ENABLED` is `1`).                                | `my-cache`                                           |
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
