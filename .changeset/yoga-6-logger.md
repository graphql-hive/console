---
'@graphql-hive/yoga': patch
---

Fix logging with `graphql-yoga@6`, which replaced `yoga.logger` with a Hive Logger at `yoga.log`. Previously, any log written by the Hive client or the usage collector threw when used with `graphql-yoga@6`.
