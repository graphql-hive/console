---
'@graphql-hive/laboratory': patch
---

A disabled preflight no longer clears the stored environment and plugin state. Introspection and
operation runs keep interpolating `{{variables}}` from them while the toggle is off, as the
GraphiQL tab did.
