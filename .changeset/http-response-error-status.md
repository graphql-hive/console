---
'@graphql-hive/core': minor
---

HTTP requests that fail with an unaccepted status code now throw an `HTTPResponseError`, which
exposes the response `status` and `statusText`.
