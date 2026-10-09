---
'@graphql-hive/laboratory': minor
---

Headers set by a preflight script now win over the operation's own headers on every path:
operation runs, the cURL export and introspection. Names compare case-insensitively, so
`Authorization` in the operation and `authorization` from the script no longer produce a doubled
header. Preflight values are sent verbatim, never templated. This matches what the GraphiQL tab
did.
