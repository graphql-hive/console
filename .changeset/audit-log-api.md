---
'hive': minor
---

Add an audit log API for SIEM ingestion. `GET /audit-log/v1/events` returns an organization's audit log events oldest first as a stable, versioned JSON envelope, paginated with an opaque cursor (`nextCursor`, `hasMore`, and a `Link: rel="next"` header). Optional parameters: `cursor`, `since` (start of the first sync), `limit` (1–1000, default 100) and `eventTypes` (comma-separated event types). Events are returned once they are 60 seconds old, so events written slightly late are never skipped; delivery is at-least-once and clients dedupe on the event `id`. A cursor older than the retention period is reported with `cursorExpired: true`.

The API is authenticated with organization access tokens holding the new `auditLog:describe` permission and is rate limited per organization. It is disabled by default and enabled with `FEATURE_FLAGS_AUDIT_LOG_API_ENABLED=1`; while disabled, the endpoint does not exist and the permission is not offered.
