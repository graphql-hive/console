---
'@graphql-hive/gateway-plugin-console-sdk': minor
---

Initial plugin release.

Hive Gateway offers addition subgraph call hooks that allow `@graphql-hive/gateway-plugin-console-sdk`
to enhance usage data when enabling `fieldLevelMetricsEnabled`.

The `fieldLevelMetricsEnabled` option enabled collecting:

1. Error Codes: The error path and code (from `extensions.code`) are parsed from the graphql
   response errors.
2. Resolution Counts: The number of times a schema coordinate is executed is extracted from graphql
   response data.

And when this plugin is used, then these metrics can be collected directly from the subgraph calls.
This further enhances the data to be closer to the underlying API (instead of error codes
potentially being masked), and it allows collecting:

3. Subgraph response times: How long a request takes to resolve is calculated for each subgraph
   call.
4. Subgraph names: Attributes the resolution to the correct subgraph.

These new datapoints allow Hive Console to enhance your usage insights to show accurate availability
by coordinates, track error codes, and break down operations by subgraph so you get a more complete
picture of your API.
