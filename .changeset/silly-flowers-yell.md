---
'hive': minor
---

Added opt-in AWS IAM authentication on MSK for self-hosters deployed on AWS. When enabled, the
`usage` and `usage-ingestor` services authenticate to Kafka using AWS IAM (SigV4) via the
OAUTHBEARER SASL mechanism ??? no static username/password required.

| Variable                     | Service               | Description                                                              |
| ---------------------------- | --------------------- | ------------------------------------------------------------------------ |
| `AWS_REGION`                 | usage, usage-ingestor | Default AWS region for the service for all AWS connections.              |
| `KAFKA_AWS_IAM_AUTH_ENABLED` | usage, usage-ingestor | Set to `1` to enable IAM authentication.                                 |
| `KAFKA_AWS_REGION`           | usage, usage-ingestor | Optional override for the Kafka broker region (defaults to `AWS_REGION`) |

To enable IAM authentication, both `AWS_REGION` and `KAFKA_AWS_IAM_AUTH_ENABLED=1` must be set.
The service will then generate a short-lived SigV4 authentication token using the pod/instance's
AWS credentials (e.g. IRSA, instance profile) and present it to the Kafka broker via OAUTHBEARER
SASL. 

`KAFKA_BROKER` now accepts a comma-separated list of broker addresses (e.g.
`broker1:9092,broker2:9092,broker3:9092`).
