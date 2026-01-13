# 16.10.2024

## 3.0.0

### Major Changes

- [#7379](https://github.com/graphql-hive/console/pull/7379)
  [`b134461`](https://github.com/graphql-hive/console/commit/b13446109d9663ccabef07995eb25cf9dff34f37)
  Thanks [@ardatan](https://github.com/ardatan)! - - Multiple endpoints support for `HiveRegistry`
  and `PersistedOperationsPlugin`

  Breaking Changes:

  - Now there is no `endpoint` field in the configuration, it has been replaced with `endpoints`,
    which is an array of strings. You are not affected if you use environment variables to set the
    endpoint.

  ```diff
  HiveRegistry::new(
      Some(
          HiveRegistryConfig {
  -            endpoint: String::from("CDN_ENDPOINT"),
  +            endpoints: vec![String::from("CDN_ENDPOINT1"), String::from("CDN_ENDPOINT2")],
      )
  )
  ```

### Patch Changes

- [#7479](https://github.com/graphql-hive/console/pull/7479)
  [`382b481`](https://github.com/graphql-hive/console/commit/382b481e980e588e3e6cf7831558b2d0811253f5)
  Thanks [@ardatan](https://github.com/ardatan)! - Update dependencies

- Updated dependencies
  [[`b134461`](https://github.com/graphql-hive/console/commit/b13446109d9663ccabef07995eb25cf9dff34f37),
  [`b134461`](https://github.com/graphql-hive/console/commit/b13446109d9663ccabef07995eb25cf9dff34f37)]:
  - hive-console-sdk-rs@0.3.0

## 2.3.6

### Patch Changes

- Updated dependencies
  [[`0ac2e06`](https://github.com/graphql-hive/console/commit/0ac2e06fd6eb94c9d9817f78faf6337118f945eb),
  [`4b796f9`](https://github.com/graphql-hive/console/commit/4b796f95bbc0fc37aac2c3a108a6165858b42b49),
  [`a9905ec`](https://github.com/graphql-hive/console/commit/a9905ec7198cf1bec977a281c5021e0ef93c2c34)]:
  - hive-console-sdk-rs@0.2.3

## 2.3.5

### Patch Changes

- Updated dependencies
  [[`24c0998`](https://github.com/graphql-hive/console/commit/24c099818e4dfec43feea7775e8189d0f305a10c)]:
  - hive-console-sdk-rs@0.2.2

## 2.3.4

### Patch Changes

- Updated dependencies
  [[`69e2f74`](https://github.com/graphql-hive/console/commit/69e2f74ab867ee5e97bbcfcf6a1b69bb23ccc7b2)]:
  - hive-console-sdk-rs@0.2.1

## 2.3.3

### Patch Changes

- Updated dependencies
  [[`cc6cd28`](https://github.com/graphql-hive/console/commit/cc6cd28eb52d774683c088ce456812d3541d977d)]:
  - hive-console-sdk-rs@0.2.0

## 2.3.2

### Patch Changes

- Updated dependencies
  [[`d8f6e25`](https://github.com/graphql-hive/console/commit/d8f6e252ee3cd22948eb0d64b9d25c9b04dba47c)]:
  - hive-console-sdk-rs@0.1.1

## 2.3.1

### Patch Changes

- [#7196](https://github.com/graphql-hive/console/pull/7196)
  [`7878736`](https://github.com/graphql-hive/console/commit/7878736643578ab23d95412b893c091e32691e60)
  Thanks [@ardatan](https://github.com/ardatan)! - Breaking;

  - `UsageAgent` now accepts `Duration` for `connect_timeout` and `request_timeout` instead of
    `u64`.
  - `SupergraphFetcher` now accepts `Duration` for `connect_timeout` and `request_timeout` instead
    of `u64`.
  - `PersistedDocumentsManager` now accepts `Duration` for `connect_timeout` and `request_timeout`
    instead of `u64`.
  - Use original `graphql-parser` and `graphql-tools` crates instead of forked versions.

- Updated dependencies
  [[`7878736`](https://github.com/graphql-hive/console/commit/7878736643578ab23d95412b893c091e32691e60)]:
  - hive-console-sdk-rs@0.1.0

## 2.3.0

### Minor Changes

- [#7143](https://github.com/graphql-hive/console/pull/7143)
  [`b80e896`](https://github.com/graphql-hive/console/commit/b80e8960f492e3bcfe1012caab294d9066d86fe3)
  Thanks [@ardatan](https://github.com/ardatan)! - Extract Hive Console integration implementation
  into a new package `hive-console-sdk` which can be used by any Rust library for Hive Console
  integration

  It also includes a refactor to use less Mutexes like replacing `lru` + `Mutex` with the
  thread-safe `moka` package. Only one place that handles queueing uses `Mutex` now.

### Patch Changes

- [#7143](https://github.com/graphql-hive/console/pull/7143)
  [`b80e896`](https://github.com/graphql-hive/console/commit/b80e8960f492e3bcfe1012caab294d9066d86fe3)
  Thanks [@ardatan](https://github.com/ardatan)! - Fixes a bug when Persisted Operations are enabled
  by default which should be explicitly enabled

- Updated dependencies
  [[`b80e896`](https://github.com/graphql-hive/console/commit/b80e8960f492e3bcfe1012caab294d9066d86fe3)]:
  - hive-console-sdk-rs@0.0.1

## 2.2.0

### Minor Changes

- [#6906](https://github.com/graphql-hive/console/pull/6906)
  [`7fe1c27`](https://github.com/graphql-hive/console/commit/7fe1c271a596353d23ad770ce667f7781be6cc13)
  Thanks [@egoodwinx](https://github.com/egoodwinx)! - Advanced breaking change detection for inputs
  and arguments.

  With this change, inputs and arguments will now be collected from the GraphQL operations executed
  by the router, and will be reported to Hive Console.

  Additional references:

  - https://github.com/graphql-hive/console/pull/6764
  - https://github.com/graphql-hive/console/issues/6649

### Patch Changes

- [#7173](https://github.com/graphql-hive/console/pull/7173)
  [`eba62e1`](https://github.com/graphql-hive/console/commit/eba62e13f658f00a4a8f6db6b4d8501070fbed45)
  Thanks [@dotansimha](https://github.com/dotansimha)! - Use the correct plugin version in the
  User-Agent header used for Console requests

- [#6906](https://github.com/graphql-hive/console/pull/6906)
  [`7fe1c27`](https://github.com/graphql-hive/console/commit/7fe1c271a596353d23ad770ce667f7781be6cc13)
  Thanks [@egoodwinx](https://github.com/egoodwinx)! - Update Rust version to 1.90

## 2.1.3

### Patch Changes

- [#6753](https://github.com/graphql-hive/console/pull/6753)
  [`7ef800e`](https://github.com/graphql-hive/console/commit/7ef800e8401a4e3fda4e8d1208b940ad6743449e)
  Thanks [@Intellicode](https://github.com/Intellicode)! - fix tmp dir filename

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
