---
'hive': patch
---

Fix schema contract composition applying `@inaccessible` on the federation types `ContextArgument` and `FieldValue` on the supergraph SDL.

This mitigates the following error in apollo-router upon processing the supergraph:

```
could not create router: Api error(s): The supergraph schema failed to produce a valid API schema: The following errors occurred:
  - Core feature type `join__ContextArgument` cannot use @inaccessible.
  - Core feature type `join__FieldValue` cannot use @inaccessible.
```
