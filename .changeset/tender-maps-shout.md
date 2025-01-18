---
'hive': minor
---

Added OpenTelemetry traces to Usage service using a new `OPENTELEMETRY_COLLECTOR_ENDPOINT` env var.

This option is disabled by default for self-hosting, you can opt-in by setting `OPENTELEMETRY_COLLECTOR_ENDPOINT`. 


