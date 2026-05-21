---
'hive': minor
---

Add opt-in AWS IAM authentication for MSK (Kafka) connections. When enabled, services authenticate
to Kafka using AWS IAM (SigV4) via the OAUTHBEARER SASL mechanism.

### New environment variables

| Variable                     | Services              | Description                                                               |
| ---------------------------- | --------------------- | ------------------------------------------------------------------------- |
| `AWS_REGION`                 | usage, usage-ingestor | Default AWS region for the service for all AWS connections.               |
| `KAFKA_AWS_IAM_AUTH_ENABLED` | usage, usage-ingestor | Set to `1` to enable IAM authentication.                                  |
| `KAFKA_AWS_REGION`           | usage, usage-ingestor | Optional override for the Kafka broker region (defaults to `AWS_REGION`). |

### To enable

- `KAFKA_AWS_IAM_AUTH_ENABLED=1`
- `KAFKA_SSL=1` must be set (IAM authentication requires TLS).
- `KAFKA_AWS_REGION` or `AWS_REGION` must be set.
- The pod/instance must have AWS credentials available (e.g. IRSA, EKS Pod Identity, instance
  profile) with the appropriate MSK IAM permissions.

### Other changes

- `KAFKA_BROKER` now accepts a comma-separated list of broker addresses
  (e.g. `broker1:9092,broker2:9092,broker3:9092`).
