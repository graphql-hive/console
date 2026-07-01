# EXPERIMENTAL: Hive Client for Hive Gateway

[Hive](https://the-guild.dev/graphql/hive) is a fully open-source schema registry, analytics,
metrics and gateway for [GraphQL federation](https://the-guild.dev/graphql/hive/federation) and
other GraphQL APIs.

---

[Documentation](https://the-guild.dev/graphql/hive/docs/other-integrations/hive-gateway)

---

## Key Features

Hive Gateway runs on Yoga, so you can choose to use `@graphql-hive/yoga`. However, Hive Gateway
offers addition subgraph call hooks that allow `@graphql-hive/gateway-plugin-console-sdk` to enhance
usage data when enabling `fieldLevelMetricsEnabled`.

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

### Disclaimer

Parsing large response payloads is computationally expensive. Enabling this feature will impact your
gateway's CPU usage. It's recommended to increase the number of gateway instances you have when
enabling this feature, and then to evaluate CPU. Each API is different, and therefore we can't
provide an exact percent increase by, but to be safe we recommend increasing instance size by 50%.

## Usage

To create the plugin:

```
import { useHive } from '@graphql-hive/gateway-plugin-console-sdk';
const plugin = useHive({
  token: TOKEN,
  usage: {
    fieldLevelMetricsEnabled: true,
  },
});
```

Or use with the gateway config:

```
import { defineConfig } from "@graphql-hive/gateway";
import { useHive } from '@graphql-hive/gateway-plugin-console-sdk';

export const gatewayConfig = defineConfig({
  // Disable default reporter and usage provider, "@graphql-hive/yoga"
  reporting: {
    enabled: false,
    type: "hive",
    usage: false,
  },
  plugins: (ctx) => [
    // Enable gateway plugin as the hive reporter and usage tracker
    useHive({
      token: process.env.HIVE_USAGE_ACCESS_TOKEN,
      usage: {
        fieldLevelMetricsEnabled: true,
      },
      enabled: true,
    }),
  ],
});

```
