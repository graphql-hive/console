  ---
'hive': major
---

Add mutation fields for managing projects to the public api schema.
- `Mutation.createProject`
- `Mutation.updateProjectSlug`
- `Mutation.deleteProject`

**BREAKING CHANGE**: This renames and changes the types for existing types within the private GraphQL schema.
