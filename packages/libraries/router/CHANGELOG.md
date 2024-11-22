# 16.10.2024

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
