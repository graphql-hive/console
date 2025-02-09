# Rate Limit

The rate limit service is responsible of enforcing account limitations. If you are self-hosting Hive
you don't need this service.

## Configuration

| Name                                 | Required                                           | Description                                                                                              | Example Value                                        |
| ------------------------------------ | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `PORT`                               | **Yes**                                            | The HTTP port of the service.                                                                            | `4012`                                               |
| `LIMIT_CACHE_UPDATE_INTERVAL_MS`     | No                                                 | The cache update interval limit in milliseconds.                                                         | `60_000`                                             |
| `POSTGRES_HOST`                      | **Yes**                                            | Host of the postgres database                                                                            | `127.0.0.1`                                          |
| `POSTGRES_PORT`                      | **Yes**                                            | Port of the postgres database                                                                            | `5432`                                               |
| `POSTGRES_DB`                        | **Yes**                                            | Name of the postgres database.                                                                           | `registry`                                           |
| `POSTGRES_USER`                      | **Yes**                                            | User name for accessing the postgres database.                                                           | `postgres`                                           |
| `POSTGRES_PASSWORD`                  | No                                                 | Password for accessing the postgres database.                                                            | `postgres`                                           |
| `USAGE_ESTIMATOR_ENDPOINT`           | **Yes**                                            | The endpoint of the usage estimator service.                                                             | `http://127.0.0.1:4011`                              |
| `EMAILS_ENDPOINT`                    | No (if not provided no limit emails will be sent.) | The endpoint of the GraphQL Hive Email service.                                                          | `http://127.0.0.1:6260`                              |
| `ENVIRONMENT`                        | No                                                 | The environment of your Hive app. (**Note:** This will be used for Sentry reporting.)                    | `staging`                                            |
| `SENTRY`                             | No                                                 | Whether Sentry error reporting should be enabled.                                                        | `1` (enabled) or `0` (disabled)                      |
| `SENTRY_DSN`                         | No                                                 | The DSN for reporting errors to Sentry.                                                                  | `https://dooobars@o557896.ingest.sentry.io/12121212` |
| `PROMETHEUS_METRICS`                 | No                                                 | Whether Prometheus metrics should be enabled                                                             | `1` (enabled) or `0` (disabled)                      |
| `PROMETHEUS_METRICS_LABEL_INSTANCE`  | No                                                 | The instance label added for the prometheus metrics.                                                     | `rate-limit`                                         |
| `PROMETHEUS_METRICS_PORT`            | No                                                 | Port on which prometheus metrics are exposed                                                             | Defaults to `10254`                                  |
| `WEB_APP_URL`                        | No                                                 | The base url of the web app                                                                              | `https://your-instance.com`                          |
| `REQUEST_LOGGING`                    | No                                                 | Log http requests                                                                                        | `1` (enabled) or `0` (disabled)                      |
| `LOG_LEVEL`                          | No                                                 | The verbosity of the service logs. One of `trace`, `debug`, `info`, `warn` ,`error`, `fatal` or `silent` | `info` (default)                                     |
| `OPENTELEMETRY_COLLECTOR_ENDPOINT`   | No                                                 | OpenTelemetry Collector endpoint. The expected traces transport is HTTP (port `4318`).                   | `http://localhost:4318/v1/traces`                    |
| `OPENTELEMETRY_TRACE_USAGE_REQUESTS` | No                                                 | If enabled, requests send to this service from `usage` service will be monitored with OTEL.              | `1` (enabled, or ``)                                 |
