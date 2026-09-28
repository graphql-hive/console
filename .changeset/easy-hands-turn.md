---
'hive': minor
---

Add configurable superadmin access for self-hosted deployments.

Set `SUPERADMIN_FOREIGN_ORGANIZATION_ACTIONS` to a comma-separated list of actions
granted in organizations where a superadmin is not a member (defaults to
`*:describe`).

Set `SUPERADMIN_ORGANIZATION_ID` to an organization
UUID to treat its active SCIM-provisioned users as superadmins.
