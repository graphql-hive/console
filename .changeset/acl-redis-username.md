---
'hive': patch
---

Pass `REDIS_USERNAME` to the Redis client when authenticating with a password. It was parsed and documented for Redis ACL authentication, but only reached the client when AWS IAM auth was enabled, so ACL users could not connect.

Resolves https://github.com/graphql-hive/console/issues/8140
