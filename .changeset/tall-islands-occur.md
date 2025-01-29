---
'hive': major
---

Introduce new permission system for organization member roles.

The existing scopes assigned to organization member users are now replaced with permissions.
Using the permissions allows more granular access control to features in Hive.

This introduces the following breaking changes:

- Organization members with the default `Viewer` role, will experience downgraded permissions. They will no longer be able to create targets or projects.
- Organization member roles permissions for inviting, removing or assigning roles have been revoked. A organization admin will have to re-apply the permissions to the desired member roles.
- Organization members with permissions for managing invites, removing members, assigning roles or modifying roles are no longer restrained in granting more rights to other users. Please be aware when granting these permissions to a user role. We recommend only assigning these to member roles that are considered "Admin" user roles.

A future update will introduce resource based access control (based on project, target, service or app deployments) for organization members.
