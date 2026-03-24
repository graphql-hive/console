---
'hive-apollo-router-plugin': patch
---

Bump `hive-console-sdk` to `0.3.7` to pin `graphql-tools` to a compatible version. The previous `hive-console-sdk@0.3.5` allowed `graphql-tools@^0.5` which resolves to `0.5.2`, a version that removes public API traits (`SchemaDocumentExtension`, `FieldByNameExtension`, etc.) that `hive-console-sdk` depends on.
