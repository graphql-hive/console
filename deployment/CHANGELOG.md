# hive

## 2.1.0

### Minor Changes

- [#5564](https://github.com/graphql-hive/console/pull/5564)
  [`e0eb3bd`](https://github.com/graphql-hive/console/commit/e0eb3bdb289c6349f51d71ba0570328d2f4e98d7)
  Thanks [@dimaMachina](https://github.com/dimaMachina)! - Add preflight scripts for laboratory.

  It is now possible to add a preflight script within the laboratory that executes before sending a
  GraphQL request.
  [Learn more.](https://the-guild.dev/graphql/hive/product-updates/2024-12-27-preflight-script)

- [#5530](https://github.com/graphql-hive/console/pull/5530)
  [`38c14e2`](https://github.com/graphql-hive/console/commit/38c14e21d8fd76f04a750ede3aac07aa10685687)
  Thanks [@TuvalSimha](https://github.com/TuvalSimha)! - Add organization audit log.

  Each organization now has an audit log of all user actions that can be exported by admins.
  Exported audit logs are stored on the pre-configured S3 storage.

  In case you want to store exported audit logs on a separate S3 bucket, you can use the
  `S3_AUDIT_LOG` prefixed environment variables for the configuration.

  [Learn more.](https://graphql-hive.com/product-updates/2024-12-27-audit-logs)

- [#6234](https://github.com/graphql-hive/console/pull/6234)
  [`eecd099`](https://github.com/graphql-hive/console/commit/eecd099309e2308f216c709a1fe23f15f6d6318b)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - Adds
  `lab.prompt(message, defaultValue)` to Preflight Script API

### Patch Changes

- [#6232](https://github.com/graphql-hive/console/pull/6232)
  [`ff44b62`](https://github.com/graphql-hive/console/commit/ff44b62aebc4b5d4e3ff321ad3ed59694d94330a)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - Improvements to UI of Preflight Script
  (Laboratory)

- [#6233](https://github.com/graphql-hive/console/pull/6233)
  [`7b0c920`](https://github.com/graphql-hive/console/commit/7b0c920c578a9220c0bad69d2f6b69023f8beece)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - Tiny UI fixes

## 2.0.1

### Patch Changes

- [#6158](https://github.com/graphql-hive/console/pull/6158)
  [`3093c9f`](https://github.com/graphql-hive/console/commit/3093c9fc23ab0a53926a187a91fe93ef6fee5be1)
  Thanks [@dotansimha](https://github.com/dotansimha)! - Added missing index for postgres db field
  "schema_version_changes.schema_version_id"

## 2.0.0

### Major Changes

- [#6142](https://github.com/graphql-hive/console/pull/6142)
  [`25f1460`](https://github.com/graphql-hive/console/commit/25f14604f482ac42826c63ec08bc108a67d37fd0)
  Thanks [@TuvalSimha](https://github.com/TuvalSimha)! - Upgrade the PostgreSQL version for Docker
  Compose from version 14.13 to use 16.4.

  **This change is published as major, as it requires attention based on your setup.**

  For self-hosters with a managed database, we recommend upgrading PostgreSQL based on your Cloud
  provider's or IT's recommendation.

  For self-hosters running in Docker, you can read about
  [upgrading PostgreSQL in a Docker container here](https://helgeklein.com/blog/upgrading-postgresql-in-docker-container/).

  > The Hive data that was previously created with PostgreSQL v14 is compatible with v16.

### Patch Changes

- [#6156](https://github.com/graphql-hive/console/pull/6156)
  [`b6eb5d0`](https://github.com/graphql-hive/console/commit/b6eb5d0e71e5b1d7575756d440bdbfb3116950b7)
  Thanks [@dotansimha](https://github.com/dotansimha)! - Improvement for OTEL tracing and added
  missing attributes

- [#6156](https://github.com/graphql-hive/console/pull/6156)
  [`b6eb5d0`](https://github.com/graphql-hive/console/commit/b6eb5d0e71e5b1d7575756d440bdbfb3116950b7)
  Thanks [@dotansimha](https://github.com/dotansimha)! - Performance improvements for Postgres DB
  calls (specifically `getSchemasOfVersion`, see https://github.com/graphql-hive/console/pull/6154)

## 1.2.4

### Patch Changes

- [#6138](https://github.com/graphql-hive/console/pull/6138)
  [`349a67d`](https://github.com/graphql-hive/console/commit/349a67d09ccadc22c0f3b84ceafa7157c5f3e979)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - Prevent stripe.js from loading
  automatically

## 1.2.3

### Patch Changes

- [#6115](https://github.com/graphql-hive/console/pull/6115)
  [`0d7ce02`](https://github.com/graphql-hive/console/commit/0d7ce02082a5ac02111b888132209ee0ef34c831)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - Move information about target and
  organization to logger's metadata in usage service

- [#6121](https://github.com/graphql-hive/console/pull/6121)
  [`6d78547`](https://github.com/graphql-hive/console/commit/6d78547a0f29a732713052d33d207396144e0998)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - Make optional properties optional or
  nullable in usage report v2

- [#6111](https://github.com/graphql-hive/console/pull/6111)
  [`cffd08a`](https://github.com/graphql-hive/console/commit/cffd08a53d7e5a53bb59fa68e940b693e9102485)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - Fix a missing @join\_\_field on a query
  field where @override is used, but not in all subgraphs.

## 1.2.2

### Patch Changes

- [#6065](https://github.com/graphql-hive/console/pull/6065)
  [`9297f33`](https://github.com/graphql-hive/console/commit/9297f33ad6c2c0a5ff77ea92c43ca5c97fd9a2d8)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - Allow organizations without a GitHub or Slack
  integration to add and manage integrations.

## 1.2.1

### Patch Changes

- [#5945](https://github.com/graphql-hive/console/pull/5945)
  [`03f08ca`](https://github.com/graphql-hive/console/commit/03f08ca68bb675696208a31ca002c74a628edbbb)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - Require "registry write" permissions for approving
  failed schema checks, schema versions, and the laboratory.

- [#5989](https://github.com/graphql-hive/console/pull/5989)
  [`a87a541`](https://github.com/graphql-hive/console/commit/a87a541153db901fc41fae0f33cd5de52324d8dd)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - Retry calls to Github API when creating
  check-runs

- [#5989](https://github.com/graphql-hive/console/pull/5989)
  [`a87a541`](https://github.com/graphql-hive/console/commit/a87a541153db901fc41fae0f33cd5de52324d8dd)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - Inform users about Github API issues
  when creating check runs

## 1.2.0

### Minor Changes

- [#5897](https://github.com/graphql-hive/console/pull/5897)
  [`cd9a13c`](https://github.com/graphql-hive/console/commit/cd9a13cd4f98700c79db89ac4dd60f0578442efe)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - Update `supertokens-postgresql` to `9.3`.

### Patch Changes

- [#5924](https://github.com/graphql-hive/console/pull/5924)
  [`5ad52ba`](https://github.com/graphql-hive/console/commit/5ad52ba4d1ad002a8e3b233cefe762324113cf6a)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - Fix logging for invalid operation body within usage
  reporting.

## 1.1.1

### Patch Changes

- [#5907](https://github.com/graphql-hive/console/pull/5907)
  [`5adfb6c`](https://github.com/graphql-hive/console/commit/5adfb6c39dce653ffef9fdf6af9a6a582cac0231)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - Remove option to remove the organization owner from
  the organization.

## 1.1.0

### Minor Changes

- [#5884](https://github.com/graphql-hive/platform/pull/5884)
  [`8aec41a`](https://github.com/graphql-hive/platform/commit/8aec41a36ee897aad0057e6817a9433a545fd18d)
  Thanks [@andriihrachov](https://github.com/andriihrachov)! - Add `REDIS_TLS_ENABLED` environment
  variable for enabling and disabling Redis TLS for `emails`, `schema`, `tokens`, `webhooks` and
  `server` services.

- [#5889](https://github.com/graphql-hive/platform/pull/5889)
  [`0eef5ed`](https://github.com/graphql-hive/platform/commit/0eef5edc6b8a940d3e70b5ea322a73ac6af07d33)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - Update `supertokens-postgresql` to `8.0`.

## 1.0.2

### Patch Changes

- [#5872](https://github.com/graphql-hive/platform/pull/5872)
  [`580d349`](https://github.com/graphql-hive/platform/commit/580d349d45b85dc6103b39c6e07bc3d81e5d3bc9)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - Bump @theguild/federation-composition
  to v0.14.1

## 1.0.1

### Patch Changes

- [#5858](https://github.com/graphql-hive/platform/pull/5858)
  [`11973c7`](https://github.com/graphql-hive/platform/commit/11973c773a3251d4b00d1bd4a509e06bfaf5288f)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - fix: conditional breaking changes form
  [#5852](https://github.com/graphql-hive/platform/pull/5852)

## 1.0.0

**This is the first officially versioned release of Hive.**

While it has been available and in use for some time, this marks the introduction of formal
versioning and a changelog to track future updates and improvements.
