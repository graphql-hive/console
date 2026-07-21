---
'@graphql-hive/cli': minor
---

Add a JSON Schema for the `hive.json` configuration file.

The CLI now ships a `hive-config.schema.json` describing the supported `hive.json` shapes (the modern
`registry`/`cdn` format, the deprecated flat format, and namespaced/space configurations). Reference
it from your config to get autocompletion, inline documentation, and validation in editors that
support JSON Schema:

```json
{
  "$schema": "https://raw.githubusercontent.com/graphql-hive/console/main/packages/libraries/cli/hive-config.schema.json",
  "registry": {
    "endpoint": "<yourRegistryURL>",
    "accessToken": "<yourtoken>"
  }
}
```
