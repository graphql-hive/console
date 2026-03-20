---
'hive': major
---

Improved performance when looking up affected app deployments for breaking change detection.

**BREAKING CHANGE**

This release introduces a breaking change because it depends on a manual database migration introduced in `10.1.0`.

If you use the app deployments feature for conditional breaking change detection, you should:
1. Upgrade to `10.1.0`
2. Perform the manual database migration steps described in that version
3. Then upgrade to this release

**Alternative upgrade path**

If you want to avoid performing the manual database migration:
1. Upgrade to `10.1.0`
2. Wait until all app deployments created **before** the rollout of `10.1.0` are retired
3. Then upgrade to this release
