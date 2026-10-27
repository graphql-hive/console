---
'hive': patch
---

The private GraphQL API (`/graphql`) now rejects requests that did not go through a CORS preflight
(e.g. `GET` requests or forms with a simple content type) unless they include the `graphql-client-name` header.

This prevents cross-site request forgery using the session cookie.
