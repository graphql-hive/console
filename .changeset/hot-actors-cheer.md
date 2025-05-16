---
'hive': major
---

Add mutation fields for managing users to the public api schema.

- `Mutation.assignMemberRole`
- `Mutation.createMemberRole`
- `Mutation.deleteMemberRole`
- `Mutation.deleteOrganizationInvitation`
- `Mutation.inviteToOrganizationByEmail`
- `Mutation.updateMemberRole`

**BREAKING CHANGE**: This renames and changes the types for existing types within the private GraphQL schema.
