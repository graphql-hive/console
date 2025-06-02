# 16.10.2024

## 2.1.2

### Patch Changes

- [#6788](https://github.com/graphql-hive/console/pull/6788)
  [`6f0af0e`](https://github.com/graphql-hive/console/commit/6f0af0eb712ce358b212b335f11d4a86ede08931)
  Thanks [@dotansimha](https://github.com/dotansimha)! - Bump version to trigger release, fix
  lockfile

## 2.1.1

### Patch Changes

- [#6714](https://github.com/graphql-hive/console/pull/6714)
  [`3f823c9`](https://github.com/graphql-hive/console/commit/3f823c9e1f3bd5fd8fde4e375a15f54a9d5b4b4e)
  Thanks [@github-actions](https://github.com/apps/github-actions)! - Updated internal Apollo crates
  to get downstream fix for advisories. See
  https://github.com/apollographql/router/releases/tag/v2.1.1

## 2.1.0

### Minor Changes

- [#6577](https://github.com/graphql-hive/console/pull/6577)
  [`c5d7822`](https://github.com/graphql-hive/console/commit/c5d78221b6c088f2377e6491b5bd3c7799d53e94)
  Thanks [@dotansimha](https://github.com/dotansimha)! - Add support for providing a target for
  usage reporting with organization access tokens.

  This can either be a slug following the format `$organizationSlug/$projectSlug/$targetSlug` (e.g
  `the-guild/graphql-hive/staging`) or an UUID (e.g. `a0f4c605-6541-4350-8cfe-b31f21a4bf80`).

  ```yaml
  # ... other apollo-router configuration
  plugins:
    hive.usage:
      enabled: true
      registry_token: 'ORGANIZATION_ACCESS_TOKEN'
      target: 'my-org/my-project/my-target'
  ```

## 2.0.0

### Major Changes

- [#6549](https://github.com/graphql-hive/console/pull/6549)
  [`158b63b`](https://github.com/graphql-hive/console/commit/158b63b4f217bf08f59dbef1fa14553106074cc9)
  Thanks [@dotansimha](https://github.com/dotansimha)! - Updated core dependnecies (body, http) to
  match apollo-router v2

### Patch Changes

- [#6549](https://github.com/graphql-hive/console/pull/6549)
  [`158b63b`](https://github.com/graphql-hive/console/commit/158b63b4f217bf08f59dbef1fa14553106074cc9)
  Thanks [@dotansimha](https://github.com/dotansimha)! - Updated thiserror, jsonschema, lru, rand to
  latest and adjust the code

## 1.1.1

### Patch Changes

- [#6383](https://github.com/graphql-hive/console/pull/6383)
  [`ec356a7`](https://github.com/graphql-hive/console/commit/ec356a7784d1f59722f80a69f501f1f250b2f6b2)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - Collect custom scalars from arguments
  and input object fields

## 1.1.0

### Minor Changes

- [#5732](https://github.com/graphql-hive/console/pull/5732)
  [`1d3c566`](https://github.com/graphql-hive/console/commit/1d3c566ddcf5eb31c68545931da32bcdf4b8a047)
  Thanks [@dotansimha](https://github.com/dotansimha)! - Updated Apollo-Router custom plugin for
  Hive to use Usage reporting spec v2.
  [Learn more](https://the-guild.dev/graphql/hive/docs/specs/usage-reports)

- [#5732](https://github.com/graphql-hive/console/pull/5732)
  [`1d3c566`](https://github.com/graphql-hive/console/commit/1d3c566ddcf5eb31c68545931da32bcdf4b8a047)
  Thanks [@dotansimha](https://github.com/dotansimha)! - Add support for persisted documents using
  Hive App Deployments.
  [Learn more](https://the-guild.dev/graphql/hive/product-updates/2024-07-30-persisted-documents-app-deployments-preview)

## 1.0.1

### Patch Changes

- [#6057](https://github.com/graphql-hive/console/pull/6057)
  [`e4f8b0a`](https://github.com/graphql-hive/console/commit/e4f8b0a51d1158da966a719f321bc13e5af39ea0)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - Explain what Hive is in README

## 1.0.0

### Major Changes

- [#5941](https://github.com/graphql-hive/console/pull/5941)
  [`762bcd8`](https://github.com/graphql-hive/console/commit/762bcd83941d7854873f6670580ae109c4901dea)
  Thanks [@dotansimha](https://github.com/dotansimha)! - Release v1 of Hive plugin for apollo-router

## 0.1.2

### Patch Changes

- [#5991](https://github.com/graphql-hive/console/pull/5991)
  [`1ea4df9`](https://github.com/graphql-hive/console/commit/1ea4df95b5fcef85f19caf682a827baf1849a28d)
  Thanks [@dotansimha](https://github.com/dotansimha)! - Improvements to release pipeline and added
  missing metadata to Cargo file

## 0.1.1

### Patch Changes

- [#5930](https://github.com/graphql-hive/console/pull/5930)
  [`1b7acd6`](https://github.com/graphql-hive/console/commit/1b7acd6978391e402fe04cc752b5e61ec05d0f03)
  Thanks [@dotansimha](https://github.com/dotansimha)! - Fixes for Crate publishing flow

## 0.1.0

### Minor Changes

- [#5922](https://github.com/graphql-hive/console/pull/5922)
  [`28c6da8`](https://github.com/graphql-hive/console/commit/28c6da8b446d62dcc4460be946fe3aecdbed858d)
  Thanks [@dotansimha](https://github.com/dotansimha)! - Initial release of Hive plugin for
  Apollo-Router

## 0.0.1

### Patch Changes

- [#5898](https://github.com/graphql-hive/console/pull/5898)
  [`1a92d7d`](https://github.com/graphql-hive/console/commit/1a92d7decf9d0593450e81b394d12c92f40c2b3d)
  Thanks [@dotansimha](https://github.com/dotansimha)! - Initial release of
  hive-apollo-router-plugin crate

- Report enum values when an enum is used as an output type and align with JS implementation

# 19.07.2024

- Writes `supergraph-schema.graphql` file to a temporary directory (the path depends on OS), and
  this is now the default of `HIVE_CDN_SCHEMA_FILE_PATH`.

# 10.04.2024

- `HIVE_CDN_ENDPOINT` and `endpoint` accept an URL with and without the `/supergraph` part

# 09.01.2024

- Introduce `HIVE_CDN_SCHEMA_FILE_PATH` environment variable to specify where to download the
  supergraph schema (default is `./supergraph-schema.graphql`)

# 11.07.2023

- Use debug level when logging dropped operations

# 07.06.2023

- Introduce `enabled` flag (Usage Plugin)

# 23.08.2022

- Don't panic on scalars used as variable types
- Introduce `buffer_size`
- Ignore operations including `__schema` or `__type`
