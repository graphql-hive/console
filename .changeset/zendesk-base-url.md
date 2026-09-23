---
'hive': patch
---

Replace the `ZENDESK_SUBDOMAIN` environment variable with `ZENDESK_BASE_URL`. When
`ZENDESK_SUPPORT=1`, set `ZENDESK_BASE_URL=https://<subdomain>.zendesk.com` (a trailing slash is
ignored). This allows pointing the support integration at a non-Zendesk host, such as a local mock
server.
