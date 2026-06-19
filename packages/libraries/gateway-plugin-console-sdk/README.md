# Hive Client for Hive Gateway

[Hive](https://the-guild.dev/graphql/hive) is a fully open-source schema registry, analytics,
metrics and gateway for [GraphQL federation](https://the-guild.dev/graphql/hive/federation) and
other GraphQL APIs.

---

[Documentation](https://the-guild.dev/graphql/hive/docs/other-integrations/hive-gateway)

---

## Key Features

Hive Gateway runs on Yoga, so you can choose to use `@graphql-hive/yoga`. However, Hive Gateway
offers addition subgraph call hooks that allow `@graphql-hive/gateway-plugin-console-sdk` to enhance
usage data.

The additional data includes:

1. Error Codes: The error path and code (from `extensions.code`) are parsed from the graphql
   response errors.
2. Resolution Counts: The number of times a schema coordinate is executed is extracted from graphql
   response data.
3. Subgraph response times: How long a request takes to resolve is calculated for each subgraph
   call.

And these new datapoints allow Hive Console to enhance your usage insights to show accurate
availability by coordinates, track error codes, and break down operations by subgraph so you get a
more complete picture of your API.

To enable this enhanced data, set the configuration option `fieldLevelMetricsEnabled: true`.

### Disclaimer

Parsing large response payloads is computationally expensive. Enabling this feature will impact your
gateway's CPU usage. It's recommended to increase the number of gateway instances you have when
enabling this feature, and then to evaluate CPU. Each API is different, and therefore we can't
provide an exact percent increase by, but to be safe we recommend doubling the processing power.

## Usage

```
import { useHive } from '@graphql-hive/gateway-plugin-console-sdk';
const plugin = useHive({
    token: TOKEN,
    usage: true,
    fieldLevelMetricsEnabled: true,
  });
```
