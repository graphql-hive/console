---
'@graphql-hive/yoga': patch
---

Fix 500 error when malformed document IDs are passed to persisted documents. Now returns a proper GraphQL error with `INVALID_DOCUMENT_ID` code.
