---
'hive': major
---

Add mutation fields for managing schema contracts to the public api schema.

- `Mutation.createContract`
- `Mutation.disableContract`

**BREAKING CHANGE**: This renames and changes the types for existing types within the private GraphQL schema.
