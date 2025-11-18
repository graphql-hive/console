---
'hive': minor
---

Introduce rate limiting for email sign up, sign in and password rest.
The IP value to use for the rate limiting can be specified via the
`SUPERTOKENS_RATE_LIMIT_IP_HEADER_NAME` environment variable.
By default the `CF-Connecting-IP` header is being used.
