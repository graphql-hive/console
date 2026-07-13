---
'@graphql-hive/laboratory': minor
---

Remove the request `retry` setting from the laboratory. Retries are the wrong primitive for an interactive GraphQL IDE (the user re-runs operations, and schema introspection already polls), and the underlying HTTP executor retried on any GraphQL `errors` response while dropping request headers on the retry, so retries went out unauthenticated. Existing persisted `retry` values are ignored automatically.
