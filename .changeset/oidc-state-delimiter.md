---
'hive': patch
---

Fix OIDC sign-in intermittently failing with "Please try again.". The server-generated OAuth state was base64url-encoded and could contain `--`, the delimiter used to separate the state from the OIDC integration id, so about 1% of OIDC logins could not find their pending sign-in state.
