---
'hive': major
---

New permission system for organization member roles.

The existing scopes assigned to organization members have been replaced with a permissions-based
system, enabling more granular access control and role-based access control (RBAC) in Hive.

**Breaking Changes**

- **Viewer Role Adjustments** – Members with the default Viewer role can no longer create targets or
  projects.
- **Restricted Role Management** – Permissions for inviting, removing, and assigning roles have been
  revoked. An admin must manually reassign these permissions where needed.
- **Expanded Role Assignment** Capabilities – Members with permissions to manage invites, remove
  members, or modify roles can now grant additional permissions without restrictions. Caution is
  advised when assigning these rights, as they should be reserved for "Admin" roles.

These changes enhance security and provide greater flexibility in managing user permissions across
organizations.
