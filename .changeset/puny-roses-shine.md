---
'@graphql-hive/core': patch
---

Fix usage collector error catching.

When async event collection fails, the error is now caught internally and logged rather than leaking an unhandled promise rejection that would crash the node application.
