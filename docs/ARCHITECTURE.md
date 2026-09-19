# Architecture

## Self-Hosted Architecture

The diagram below represents the Hive core services in
[`docker-compose.community.yml`](../docker/docker-compose.community.yml). Cloud-only services such
as billing, the Cloudflare CDN and request broker, and managed infrastructure are not part of the
self-hosted stack.

### High-Level Overview

```mermaid
flowchart TB
  subgraph clients[Clients]
    browser[Browser]
    registry[Hive CLI]
    graphql[GraphQL servers and gateways]
  end

  subgraph hive[Hive self-hosted stack]
    subgraph public[Public services]
      app[Web app]
      server[GraphQL API and registry]
      usage[Usage API]
      otel[OpenTelemetry traces]
    end

    subgraph application[Internal application services]
      schema[Schema composition]
      policy[Schema policy]
      workflows[Async workflows]
      ingestor[Usage ingestor]
    end

    subgraph data[Data and messaging]
      postgres[(PostgreSQL)]
      redis[(Redis)]
      clickhouse[(ClickHouse)]
      broker[(Redpanda / Kafka)]
      s3[(MinIO S3)]
    end

    subgraph bootstrap[Bootstrap services]
      migrations[Storage migrations]
    end
  end

  subgraph external[Optional external integrations]
    oidc[Organization OIDC provider]
    scim[SCIM identity provider]
    notifications[Notifications]
    observability[Observability]
  end
```

### Detailed Interactions

```mermaid
flowchart LR
  subgraph clients[Clients and operators]
    browser[Browser]
    registry[Hive CLI / CI]
    graphql[GraphQL servers and gateways]
  end

  subgraph hive[Hive deployment]
    subgraph public[Public services]
      app[Web app]
      server[GraphQL API and registry]
      usage[Usage API]
    end

    subgraph application[Internal application services]
      schema[Schema composition]
      policy[Schema policy]
      workflows[Async workflows]
      ingestor[Usage ingestor]
    end

    subgraph data[Data and messaging]
      postgres[(PostgreSQL)]
      redis[(Redis)]
      clickhouse[(ClickHouse)]
      broker[(Kafka-compatible event broker)]
      s3[(S3-compatible object storage)]
    end

    subgraph bootstrap[Bootstrap and maintenance]
      migrations[Storage migrations]
    end
  end

  subgraph external[Optional external integrations]
    oidc[Organization OIDC provider]
    notifications[Email, Slack, Teams,<br/>and custom webhooks]
    observability[OpenTelemetry collector,<br/>Prometheus, and Sentry]
  end

  browser -->|web console| app
  app -->|browser-facing GraphQL and subscriptions| server
  registry -->|schema checks and publishing| server
  graphql -->|usage reports| usage

  server -->|application data and job queue| postgres
  server -->|usage queries| clickhouse
  server -->|cache and sessions| redis
  server -->|compose and validate| schema
  server -->|policy checks| policy
  server -->|artifacts and audit logs| s3

  schema -->|composition cache| redis
  workflows -->|consume Graphile Worker jobs| postgres
  workflows -->|compose schemas| schema
  workflows -->|pub/sub and cache| redis

  usage -->|authorization data| postgres
  usage -->|cache| redis
  usage -->|usage_reports_v2| broker
  broker -->|usage_reports_v2| ingestor
  ingestor -->|persist usage| clickhouse

  migrations -->|schema migrations| postgres
  migrations -->|schema and retention migrations| clickhouse

  server -->|authenticate| oidc
  workflows -.->|deliver notifications| notifications
  server -.->|traces, metrics, and errors| observability
  schema -.->|traces, metrics, and errors| observability
  policy -.->|traces, metrics, and errors| observability
  workflows -.->|metrics and errors| observability
  usage -.->|metrics and errors| observability
  ingestor -.->|metrics and errors| observability
  app -.->|errors| observability
```

PostgreSQL, Redis, ClickHouse, Redpanda, and MinIO persist their data under `docker/.hive/` by
default. MinIO exposes its API and administration console directly in addition to the Caddy reverse
proxy. Redpanda also publishes its Kafka listener on port `9092` and metrics/admin endpoint on port
`9644`.

The observability integrations are optional. The community Compose file does not run an
OpenTelemetry collector, Prometheus, or Sentry; operators provide and configure these externally.
