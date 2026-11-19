---
'hive': minor
---

Add a target setting that allows the author of a change to approve their own failed schema check.
It is off by default, so the author of a change still cannot approve their own failed check unless
the setting is enabled for the target under Settings → Breaking Changes. Changing the setting
requires the "Modify settings" target permission and is recorded in the audit log.
