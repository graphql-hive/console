---
'hive': patch
---

Remove content-type header from sso discovery doc request. Since no payload is sent with this
request, the header can cause the request to fail. This header is specifically not required by the
configuration request
