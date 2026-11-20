---
'hive': patch
---

Remove unused dependencies from the services: `@opentelemetry/auto-instrumentations-node`,
`@opentelemetry/sdk-node`, `@aws-sdk/s3-request-presigner`, `@aws-sdk/client-s3`, `copyfiles` and
`itty-router-extras`. None of them were included in the service builds, so behavior is unchanged.
