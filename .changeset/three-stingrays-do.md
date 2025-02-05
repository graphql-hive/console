---
'@graphql-hive/yoga': patch
---

Correctly extract client information when using the response cache plugin.

The client information was not reported for GraphQL responses served from the response cache plugin.
