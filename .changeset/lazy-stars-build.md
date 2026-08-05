---
'@graphql-hive/gateway-plugin-console-sdk': patch
'@graphql-hive/core': patch
---

Support Rust query planner execution by setting default operation root type name in
collected payload's "paths" if not returned in subgraph call request info.
