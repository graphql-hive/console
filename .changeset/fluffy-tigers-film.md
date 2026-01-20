---
'hive-apollo-router-plugin': patch
---

Updated `hive-apollo-router-plugin` to use `hive-console-sdk` from crates.io instead of a local dependency. The plugin now uses `graphql-tools::parser` instead of `graphql-parser` to leverage the parser we now ship in `graphql-tools` crate.
