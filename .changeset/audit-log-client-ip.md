---
'hive': minor
---

Record the IP address and user agent of the client for all audit log events. The values are stored in the new `ip_address` and `user_agent` columns and included in the audit log CSV export.

Add the `CLIENT_IP_HEADER_NAME` environment variable to the server, which configures the header containing the client IP address set by your CDN/proxy (e.g. `CF-Connecting-IP`). It is used for rate limiting and audit logs. If not set, the IP address of the request is used.
Only configure a header that your CDN/proxy always overwrites, as clients can otherwise spoof their IP address.

`SUPERTOKENS_RATE_LIMIT_IP_HEADER_NAME` is deprecated in favor of `CLIENT_IP_HEADER_NAME` and is still respected as a fallback.

**Note:** Previously `SUPERTOKENS_RATE_LIMIT_IP_HEADER_NAME` defaulted to `CF-Connecting-IP`.
