## Readme

Each of the JSON file in this folder contains an array of requests sent to the otel-collector for
the specific GraphQL operation.

All the files will be parsed and used as a template for seeding the clickhouse database with somehow
realistic trace data.

### Usage

- Create a federation target and publish our federation example
  (https://the-guild.dev/graphql/hive/docs/get-started/apollo-federation).
- Create a organization access token and target to which you want to push the data.

Then run the following script:

```
HIVE_ORGANIZATION_ACCESS_TOKEN=hvo1/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx= \
HIVE_TARGET_REF=the-guild/otel-demo/development \
node --experimental-strip-types seed-traces.mts
```

You can adjust the amount of days you want to seed by setting `USAGE_DAYS` (e.g. `USAGE_DAYS=5` will
seed the last 5 days). By default we seed the last 14 days.

You can adjust how frequent the reporting interval is by setting `USAGE_INTERVAL` (e.g.
`USAGE_DAYS=20`). By default the value is 20 (minutes).

### Adding more fixtures

In case you want to add additional traces starte the intercept server (`interspect-service.mts`),
point the gateway to that endpoint and copy the output to a new file within this folder.
