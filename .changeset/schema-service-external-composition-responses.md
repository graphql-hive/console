---
'hive': patch
---

A malformed response from an external composition service, such as a body that is not JSON or a success result whose supergraph or SDL does not parse, is now reported as a composition failure instead of failing the request with an unexpected error.
