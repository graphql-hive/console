---
'@graphql-hive/core': patch
---

Create a copy of subrequest errors when collecting usage metrics. This avoids storing more data than
necessary and prevents the error object from being cleaned up by other processes (e.g. rust query
planner)
