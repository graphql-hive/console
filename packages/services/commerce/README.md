# `@hive/commerce`

This service provides the commerce backend for Hive: usage estimation, rate-limit lookups,
and Stripe billing. It exposes a tRPC router (`commerceRouter` in `src/api.ts`) consumed by
the `server` and `usage` services via the `COMMERCE_ENDPOINT` configuration.

The service listens on port `4012` by default.

## Configuration

| Name                                | Required | Description                                                                                              | Example Value                                        |
| ----------------------------------- | -------- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `PORT`                              | No       | The port this service is running on.                                                                     | `4012`                                               |
| `ENVIRONMENT`                       | No       | The environment of your Hive app. (**Note:** This will be used for Sentry reporting.)                    | `staging`                                            |
| `RELEASE`                           | No       | The release identifier reported with Sentry events. Defaults to `local`.                                 | `v9.6.0`                                             |
| `WEB_APP_URL`                       | No       | Public URL of the Hive web app.                                                                          | `http://localhost:3000`                              |
| `CLICKHOUSE_PROTOCOL`               | **Yes**  | The protocol used to connect to ClickHouse.                                                              | `http` or `https`                                    |
| `CLICKHOUSE_HOST`                   | **Yes**  | Host of the ClickHouse instance.                                                                         | `127.0.0.1`                                          |
| `CLICKHOUSE_PORT`                   | **Yes**  | Port of the ClickHouse instance.                                                                         | `8123`                                               |
| `CLICKHOUSE_USERNAME`               | **Yes**  | Username for accessing ClickHouse.                                                                       | `default`                                            |
| `CLICKHOUSE_PASSWORD`               | **Yes**  | Password for accessing ClickHouse.                                                                       | `clickhouse`                                         |
| `POSTGRES_HOST`                     | **Yes**  | Host of the postgres database.                                                                           | `127.0.0.1`                                          |
| `POSTGRES_PORT`                     | **Yes**  | Port of the postgres database.                                                                           | `5432`                                               |
| `POSTGRES_DB`                       | **Yes**  | Name of the postgres database.                                                                           | `registry`                                           |
| `POSTGRES_USER`                     | **Yes**  | User name for accessing the postgres database.                                                           | `postgres`                                           |
| `POSTGRES_PASSWORD`                 | No       | Password for accessing the postgres database.                                                            | `postgres`                                           |
| `POSTGRES_SSL`                      | No       | Whether the postgres connection should be established via SSL.                                           | `1` (enabled) or `0` (disabled)                      |
| `LIMIT_CACHE_UPDATE_INTERVAL_MS`    | No       | How often, in milliseconds, the rate-limit cache is refreshed. Defaults to `60000`.                      | `60000`                                              |
| `STRIPE_SECRET_KEY`                 | **Yes**  | Secret key used to call the Stripe API.                                                                  | `sk_test_...`                                        |
| `STRIPE_SYNC_INTERVAL_MS`           | No       | How often, in milliseconds, Stripe subscription state is synced. Defaults to `600000` (10 minutes).      | `600000`                                             |
| `SENTRY`                            | No       | Whether Sentry error reporting should be enabled.                                                        | `1` (enabled) or `0` (disabled)                      |
| `SENTRY_DSN`                        | No       | The DSN for reporting errors to Sentry. Required when `SENTRY=1`.                                        | `https://dooobars@o557896.ingest.sentry.io/12121212` |
| `PROMETHEUS_METRICS`                | No       | Whether Prometheus metrics should be enabled.                                                            | `1` (enabled) or `0` (disabled)                      |
| `PROMETHEUS_METRICS_LABEL_INSTANCE` | No       | The instance label added for the prometheus metrics. Defaults to `rate-limit`.                           | `commerce`                                           |
| `PROMETHEUS_METRICS_PORT`           | No       | Port on which prometheus metrics are exposed. Defaults to `10254`.                                       | `10254`                                              |
| `REQUEST_LOGGING`                   | No       | Log http requests. Defaults to `1`.                                                                      | `1` (enabled) or `0` (disabled)                      |
| `LOG_LEVEL`                         | No       | The verbosity of the service logs. One of `trace`, `debug`, `info`, `warn`, `error`, `fatal` or `silent`. Defaults to `info`. | `info`                                               |
| `OPENTELEMETRY_COLLECTOR_ENDPOINT`  | No       | OpenTelemetry Collector endpoint. The expected traces transport is HTTP (port `4318`).                   | `http://localhost:4318/v1/traces`                    |
