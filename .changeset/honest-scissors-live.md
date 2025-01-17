---
'hive': minor
---

Added a new environment variable `OPENTELEMETRY_TRACE_USAGE_REQUESTS` for `rate-limit` and `tokens` services. 

Self-hosters who wish to report telemetry information for `usage` service, can opt-in and set `OPENTELEMETRY_TRACE_USAGE_REQUESTS=1` to these services. This will skip sampling and will always trace requests originating from the `usage` service.
