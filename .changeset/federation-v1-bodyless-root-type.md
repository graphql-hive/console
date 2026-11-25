---
'hive': patch
---

Fix legacy Federation v1 composition dropping part of a subgraph. Since 15.7.0, when a subgraph
declared a root type without fields (for example `type Mutation`, with the fields added later
through `extend type Mutation { ... }`) or a type extension without a body, every definition that
followed it in that subgraph was left out of the composed schema, while composition still reported
success.

A graph that was published while affected keeps the incomplete schema until it is composed again.
Publishing an unchanged schema is skipped, so publish a subgraph with a small change to compose it
again.
