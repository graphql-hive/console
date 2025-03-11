---
'hive': major
---

Add organization access tokens; a new way to issue access tokens for performing actions with the CLI
and doing usage reporting.

**Breaking Change:** The `usage` service now requires environment variables for Postgres
(`POSTGRES_SSL`, `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_DB`, `POSTGRES_USER`,
`POSTGRES_PASSWORD`) and Redis (`REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `REDIS_TLS_ENABLED`).

For more information please refer to the organization access token documentation.

- [Product Update: Organization-Level Access Tokens for Enhanced Security & Flexibility](https://the-guild.dev/graphql/hive/product-updates/2025-03-10-new-access-tokens)
- [Migration Guide: Moving from Registry Access Tokens to Access Tokens](https://the-guild.dev/graphql/hive/docs/migration-guides/organization-access-tokens)
- [Access Token Documentation](https://the-guild.dev/graphql/hive/docs/management/access-tokens)
