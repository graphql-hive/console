---
'@graphql-hive/cli': patch
---

Improve error handling for graphql requests

Fixes an edge case where if the graphql error response doesn't include the extension, then an unexpected error was thrown. Additionally, if this error was thrown, then the error response was not logged even if the debug logs are enabled. This moves the debug log to before these conditions so that it is possible to always see the response in the logs.