---
'hive': minor
---

Added opt-in AWS IAM authentication for ElastiCache Redis connections and Redis Cluster mode
support. When IAM is enabled, services authenticate to Redis using short-lived SigV4 pre-signed
tokens instead of static passwords, with automatic token refresh before expiry.

### New environment variables

| Variable                     | Service                                  | Description                                                                   |
| ---------------------------- | ---------------------------------------- | ----------------------------------------------------------------------------- |
| `AWS_REGION`                 | schema, server, tokens, usage, workflows | Default AWS region for all AWS connections.                                   |
| `REDIS_AWS_IAM_AUTH_ENABLED` | schema, server, tokens, usage, workflows | Set to `1` to enable IAM authentication for Redis.                            |
| `REDIS_AWS_IAM_CACHE_NAME`   | schema, server, tokens, usage, workflows | The ElastiCache Redis cache instance name. Used as the host for the signer.   |
| `REDIS_AWS_REGION`           | schema, server, tokens, usage, workflows | Optional override for the Redis region (defaults to `AWS_REGION`).            |
| `REDIS_CLUSTER_MODE_ENABLED` | schema, server, tokens, usage, workflows | Set to `1` to connect using Redis Cluster mode.                               |
| `REDIS_USERNAME`             | schema, server, tokens, usage, workflows | Optional Redis username for ACL-based authentication (defaults to `default`). |

### To enable

- `REDIS_AWS_IAM_AUTH_ENABLED=1`
- `REDIS_TLS_ENABLED=1` must be set (IAM authentication requires TLS).
- `REDIS_AWS_REGION` or `AWS_REGION` must be set.
- `REDIS_AWS_IAM_CACHE_NAME` set to the name of the cache instance in AWS. This will be used as the hostname for the signer.
- The pod/instance must have AWS credentials available (e.g. IRSA, EKS Pod Identity, instance
  profile) with the appropriate ElastiCache IAM permissions.
