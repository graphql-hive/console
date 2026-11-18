---
'hive': patch
---

The API now retries failed requests to S3-compatible storage (such as Cloudflare R2) up to 5 times instead of 2.
