---
'@graphql-hive/core': patch
'@graphql-hive/apollo': patch
'@graphql-hive/envelop': patch
'@graphql-hive/gateway-plugin-console-sdk': patch
'@graphql-hive/yoga': patch
---

Deprecate run-time reporting schemas from `useHive` plugin.

Use Hive CLI (`@graphql-hive/cli`) to publish the schema file instead. This aligns with best practices for schema management and prevents an issue where multiple service instances result in numerous publishes to Hive.
