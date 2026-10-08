---
'@graphql-hive/render-laboratory': patch
---

Forward the `endpoint` GraphiQL option to the Lab as its default endpoint.

`renderLaboratory({ endpoint })` used to drop it, so the Lab always started on the endpoint saved in the browser or, failing that, on the page's own URL. That is wrong when the Lab is served from a path other than the GraphQL endpoint. A configured `endpoint` now wins over a saved one on every load. Leave it unset to keep the previous behavior.
