---
'hive': major
---

Add target management fields to the public GraphQL API schema.

This includes the following fields and related types/fields:

- `Mutation.updateTargetConditionalBreakingChangeConfiguration`
- `Mutation.updateTargetSlug`
- `Mutation.updateTargetDangerousChangeClassification`
- `Mutation.createTarget`
- `Mutation.deleteTarget`
- `Mutation.createCdnAccessToken`
- `Mutation.deleteCdnAccessToken`
- `Target.conditionalBreakingChangeConfiguration`
- `Target.failDiffOnDangerousChange`
- `Target.cdnAccessTokens`
- `Organization.availableOrganizationAccessTokenPermissionGroups`

**BREAKING CHANGE** This renames existing types and fields within the private GraphQL schema.
