---
'@graphql-hive/cli': minor
---

Add a `--header`/`-H` flag to `hive dev` to attach custom HTTP headers to the introspection
requests sent to locally running subgraphs. This allows introspecting subgraphs that require
authentication.

Headers are supplied in `key:value` format and apply to every subgraph introspected via `--url`
(services provided via `--schema` are unaffected):

```shell
hive dev \
  --service reviews --url http://localhost:3001/graphql \
  --service products --url http://localhost:3002/graphql \
  --header 'Authorization:Bearer YOUR_TOKEN'
```

The flag is repeatable and applies globally across all services being introspected.
