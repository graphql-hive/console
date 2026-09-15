---
'hive': patch
---

Fix subscription operations' client version parsing so they can populate app
deployment "last used" tracking. Subscription operations were splitting
`persistedDocumentHash` on `/` instead of `~` (the actual
`appName~appVersion~hash` format used everywhere else), so the parsed name
and version were never correct.
