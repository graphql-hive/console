---
'hive': patch
---

Fix legacy Federation v1 composition leaving default values out of the supergraph. Since 15.7.0,
the supergraph lost every default value of field arguments, input object fields and directive
arguments (for example `shippingCostV2(quantity: Int! = 1)` became
`shippingCostV2(quantity: Int!)`), so gateways rejected valid operations that relied on a default,
such as passing a nullable variable to a non-null argument with a default. The public API schema
was not affected.

Field sets in `@key`, `@requires` and `@provides` with an empty selection are reported as
composition errors again. Since 15.7.0, `fields: ""` was reported as an unexpected composition
error, and a nested empty selection such as `fields: "id dimensions { }"` composed successfully and
ended up in the supergraph.

Composition errors also lost their error code, so they were reported as GraphQL errors instead of
composition errors.

A graph that was published while affected keeps the incomplete supergraph until it is composed
again. Publishing an unchanged schema is skipped, so publish a subgraph with a small change to
compose it again.
