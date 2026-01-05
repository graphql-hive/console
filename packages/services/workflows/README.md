# Workflow Service

Services for running asynchronous tasks and cron jobs. E.g. sending email, webhooks or other
maintenance/clen up tasks.

## Structure

```
# Definition of Webook Payload Models using zod
src/webhooks/*
# Task Definitions
src/tasks/*
# General lib
src/lib/*
```

## References

- [Graphile Worker Documentation](https://worker.graphile.org/)

## Configuration

| Name                                     | Required                                              | Description                                                                                              | Example Value                                        |
| ---------------------------------------- | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `PORT`                                   | No                                                    | The port this service is running on.                                                                     | `6260`                                               |
| `POSTGRES_SSL`                           | No                                                    | Whether the postgres connection should be established via SSL.                                           | `1` (enabled) or `0` (disabled)                      |
| `POSTGRES_HOST`                          | **Yes**                                               | Host of the postgres database                                                                            | `127.0.0.1`                                          |
| `POSTGRES_PORT`                          | **Yes**                                               | Port of the postgres database                                                                            | `5432`                                               |
| `POSTGRES_DB`                            | **Yes**                                               | Name of the postgres database.                                                                           | `registry`                                           |
| `POSTGRES_USER`                          | **Yes**                                               | User name for accessing the postgres database.                                                           | `postgres`                                           |
| `POSTGRES_PASSWORD`                      | No                                                    | Password for accessing the postgres database.                                                            | `postgres`                                           |
| `EMAIL_FROM`                             | **Yes**                                               | The email address used for sending emails                                                                | `kamil@graphql-hive.com`                             |
| `EMAIL_PROVIDER`                         | **Yes**                                               | The email provider that should be used for sending emails.                                               | `smtp` or `postmark` or `mock`                       |
| `EMAIL_PROVIDER_SMTP_PROTOCOL`           | No (**Yes** if `EMAIL_PROVIDER` is set to `smtp`)     | The protocol used for the smtp server                                                                    | `smtp` or `smtps`                                    |
| `EMAIL_PROVIDER_SMTP_HOST`               | No (**Yes** if `EMAIL_PROVIDER` is set to `smtp`)     | The host of the smtp server                                                                              | `127.0.0.1`                                          |
| `EMAIL_PROVIDER_SMTP_PORT`               | No (**Yes** if `EMAIL_PROVIDER` is set to `smtp`)     | The port of the smtp server                                                                              | `25`                                                 |
| `EMAIL_PROVIDER_SMTP_AUTH_USERNAME`      | No (**Yes** if `EMAIL_PROVIDER` is set to `smtp`)     | The username for the smtp server.                                                                        | `letmein`                                            |
| `EMAIL_PROVIDER_SMTP_AUTH_PASSWORD`      | No (**Yes** if `EMAIL_PROVIDER` is set to `smtp`)     | The password for the smtp server.                                                                        | `letmein`                                            |
| `EMAIL_PROVIDER_POSTMARK_TOKEN`          | No (**Yes** if `EMAIL_PROVIDER` is set to `postmark`) | The postmark token.                                                                                      | `abcdefg123`                                         |
| `EMAIL_PROVIDER_POSTMARK_MESSAGE_STREAM` | No (**Yes** if `EMAIL_PROVIDER` is set to `postmark`) | The postmark message stream.                                                                             | `abcdefg123`                                         |
| `ENVIRONMENT`                            | No                                                    | The environment of your Hive app. (**Note:** This will be used for Sentry reporting.)                    | `staging`                                            |
| `HEARTBEAT_ENDPOINT`                     | No                                                    | The endpoint for a heartbeat.                                                                            | `http://127.0.0.1:6969/heartbeat`                    |
| `SENTRY`                                 | No                                                    | Whether Sentry error reporting should be enabled.                                                        | `1` (enabled) or `0` (disabled)                      |
| `SENTRY_DSN`                             | No                                                    | The DSN for reporting errors to Sentry.                                                                  | `https://dooobars@o557896.ingest.sentry.io/12121212` |
| `PROMETHEUS_METRICS`                     | No                                                    | Whether Prometheus metrics should be enabled                                                             | `1` (enabled) or `0` (disabled)                      |
| `PROMETHEUS_METRICS_LABEL_INSTANCE`      | No                                                    | The instance label added for the prometheus metrics.                                                     | `emails`                                             |
| `PROMETHEUS_METRICS_PORT`                | No                                                    | Port on which prometheus metrics are exposed                                                             | Defaults to `10254`                                  |
| `LOG_LEVEL`                              | No                                                    | The verbosity of the service logs. One of `trace`, `debug`, `info`, `warn` ,`error`, `fatal` or `silent` | `info` (default)                                     |
| `OPENTELEMETRY_COLLECTOR_ENDPOINT`       | No                                                    | OpenTelemetry Collector endpoint. The expected traces transport is HTTP (port `4318`).                   | `http://localhost:4318/v1/traces`                    |
| `REQUEST_BROKER`                         | No                                                    | Whether Request Broker should be enabled.                                                                | `1` (enabled) or `0` (disabled)                      |
| `REQUEST_BROKER_ENDPOINT`                | No                                                    | The address                                                                                              | `https://broker.worker.dev`                          |
| `REQUEST_BROKER_SIGNATURE`               | No                                                    | A secret signature needed to verify the request origin                                                   | `hbsahdbzxch123`                                     |
| `REQUEST_LOGGING`                        | No                                                    | Log http requests                                                                                        | `1` (enabled) or `0` (disabled)                      |
