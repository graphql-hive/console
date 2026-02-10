---
'hive': patch
---

Handle OIDC token exchange errors gracefully instead of returning 500. Classifies OAuth 2.0 error codes into user-safe messages without leaking sensitive provider details.
