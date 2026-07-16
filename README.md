![Hive Platform](https://the-guild.dev/graphql/hive/github-org-image.png)

# Hive Console

Hive Console is a schema registry and analytics platform for
[GraphQL federation](https://the-guild.dev/graphql/hive/federation) and other GraphQL APIs. Fully
open-source and MIT licensed. Use Hive Cloud (managed) or self-host it.

## Get Started

- [Use Hive Cloud](https://the-guild.dev/graphql/hive)
  ([status page](https://status.graphql-hive.com))
- [Read the product documentation](https://the-guild.dev/graphql/hive/docs)
- [Use the Hive CLI](./packages/libraries/cli/README.md) for schema publishing and checks in CI
- [Self-host Hive](https://the-guild.dev/graphql/hive/docs/schema-registry/self-hosting/get-started)
  with the community Docker Compose configuration
- [Contribute locally](#development)

## Built for the community, for all GraphQL APIs

Hive Console has been built with 3 main objectives in mind:

- **Help GraphQL developers to get to know their GraphQL APIs** a little more with our Schema
  Registry, Performance Monitoring, Alerts, and Integrations.
- **Support all kinds of GraphQL APIs**, from Federation, and Stitching, to standalone APIs.
- **Open Source at the heart**: 100% open-source and built in public with the community.
- **A managed Cloud solution or self-hosting**: choose the deployment model that fits your team.

## Features Overview

### Schema Registry

Hive Console helps you manage your GraphQL API with:

- **Prevent breaking changes** - Hive Console runs a set of checks and notifies your team via Slack,
  GitHub, or within the application.
- **Data-driven** definition of a “breaking change” based on Operations Monitoring.
- **History of changes** - an access to the full history of changes, even on a complex composed
  schema (Federation, Stitching).
- **High-availability and multi-zone CDN** service based on Cloudflare to access Schema Registry

### Monitoring

Once a Schema is deployed, **it is important to be aware of how it is used and what is the
experience of its final users**.

Hive Console gives you a global overview of GraphQL API usage with:

- Error rates and distribution
- Global and operation performance, including latency and request volume
- Operation counts and active GraphQL clients

### OpenTelemetry Tracing

Inspect distributed GraphQL traces alongside usage data. Hive captures spans, HTTP and client
metadata, operation status, and federation subgraph activity to help diagnose production requests.

### App Deployments (Persisted Documents)

Publish versioned persisted-document artifacts, activate or retire deployments safely, and serve
approved operations through the CDN.
[Learn more.](https://the-guild.dev/graphql/hive/docs/schema-registry/app-deployments)

### Integrations

Hive Console integrates with Slack and GitHub, and its CLI works with any CI/CD system for schema
checks, publishing, and operation checks.

Configure Slack, Microsoft Teams, or custom webhooks to notify your team about schema and metric
alerts. Organization OIDC and audit-log exports are also available for teams that need centralized
access management and governance.

If you use GitHub, the Hive Console app can add status checks to pull requests.

## Self-Hosting

Hive Console is MIT licensed and can run on your own infrastructure. To get started
[check out the documentation for self-hosting](https://the-guild.dev/graphql/hive/docs/schema-registry/self-hosting/get-started).

## Development

This repository is a pnpm/Turborepo monorepo containing the web console, GraphQL services, CLI,
workers, migrations, and integration tests.

Prerequisites: Node.js 24.17.0 or later, pnpm 10.33.2 or later, and Docker 26.1.1 or later.

```bash
pnpm install
pnpm local:setup
pnpm generate
pnpm dev:hive
```

Open <http://localhost:3000> when the services are ready. The
[development guide](./docs/DEVELOPMENT.md) covers environment setup, required ports, optional
observability, seed data, and troubleshooting.

### Join us in building the future of Hive Console

Like all [The Guild](https://the-guild.dev) projects, Hive Console is built with the community.

We can't wait to get your feedback, pull requests, and feature requests.

Please refer to the
[contribution guide](https://the-guild.dev/graphql/hive/docs/schema-registry/contributing) to learn
more.

## Project Stack

- Runtime: Node.js, TypeScript, go (otel collector)
- Package Manager: pnpm
- APIs: Fastify, GraphQL-Yoga, GraphQL-Codegen, GraphQL-Modules
- App: React, Vite, Fastify, Tailwind
- CLI: Oclif
- Deployment: Docker Compose, Pulumi, Kubernetes, Contour (Envoy), Cloudflare Workers and/or AWS
  Lambda, R2 and/or any other S3 compatible storage
- Monitoring: OpenTelemetry, Prometheus, Grafana, Tempo, Sentry
- Data and messaging: PostgreSQL, Redis, ClickHouse, Kafka/Redpanda, S3-compatible storage

## Docs

- [Contributing](./docs/CONTRIBUTING.md)
- [Development](./docs/DEVELOPMENT.md)
- [Deployment](./docs/DEPLOYMENT.md)
- [Testing](./docs/TESTING.md)
- [Architecture](./docs/ARCHITECTURE.md)
- [Security policy](./SECURITY.md)
- [Code of conduct](./CODE_OF_CONDUCT.md)
- [License](./LICENSE)
