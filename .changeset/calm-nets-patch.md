---
'hive': patch
---

Upgrade the OpenTelemetry Collector in the `otel-collector` docker image from `v0.162.0` to `v0.165.0`. This pulls in `github.com/klauspost/compress@1.20.3`, `github.com/andybalholm/brotli@1.2.7` and `golang.org/x/net@0.62.0`, addressing `CVE-2026-116591`, `CVE-2026-78661`, `CVE-2026-97045` and `GHSA-c9gr-gmg4-2vqv`.
