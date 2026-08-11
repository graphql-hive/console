# @graphql-hive/gateway-plugin-console-sdk

## 0.1.2

### Patch Changes

- Updated dependencies
  [[`658ff6a`](https://github.com/graphql-hive/console/commit/658ff6a644ef76787d1d283a34eab56c03f8ffa5)]:
  - @graphql-hive/core@0.22.2

## 0.1.1

### Patch Changes

- Updated dependencies
  [[`3dbda7d`](https://github.com/graphql-hive/console/commit/3dbda7dbe895173578cc4c452a85ef6c2ce07383)]:
  - @graphql-hive/core@0.22.1

## 0.1.0

### Minor Changes

- [#8062](https://github.com/graphql-hive/console/pull/8062)
  [`8270cac`](https://github.com/graphql-hive/console/commit/8270cac6516b20454914ee39d189e8c943487834)
  Thanks [@jdolle](https://github.com/jdolle)! - Initial plugin release.

  Hive Gateway offers addition subgraph call hooks that allow
  `@graphql-hive/gateway-plugin-console-sdk` to enhance usage data when enabling
  `fieldLevelMetricsEnabled`.

  The `fieldLevelMetricsEnabled` option enabled collecting:

  1. Error Codes: The error path and code (from `extensions.code`) are parsed from the graphql
     response errors.
  2. Resolution Counts: The number of times a schema coordinate is executed is extracted from
     graphql response data.

  And when this plugin is used, then these metrics can be collected directly from the subgraph
  calls. This further enhances the data to be closer to the underlying API (instead of error codes
  potentially being masked), and it allows collecting:

  3. Subgraph response times: How long a request takes to resolve is calculated for each subgraph
     call.
  4. Subgraph names: Attributes the resolution to the correct subgraph.

  These new datapoints allow Hive Console to enhance your usage insights to show accurate
  availability by coordinates, track error codes, and break down operations by subgraph so you get a
  more complete picture of your API.

### Patch Changes

- [#8291](https://github.com/graphql-hive/console/pull/8291)
  [`ee8af3e`](https://github.com/graphql-hive/console/commit/ee8af3edcb06f4d59b742cf2c8f2f99167bb52a0)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - Use npm trusted publishing.

- Updated dependencies
  [[`8270cac`](https://github.com/graphql-hive/console/commit/8270cac6516b20454914ee39d189e8c943487834),
  [`ee8af3e`](https://github.com/graphql-hive/console/commit/ee8af3edcb06f4d59b742cf2c8f2f99167bb52a0)]:
  - @graphql-hive/core@0.22.0
