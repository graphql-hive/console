---
'hive': patch
---

A dangerous change that a target is set to fail on now respects conditional breaking changes when
usage is recorded for what it touches: an argument with a default value added to a field that no
operation requests is reported as safe based on usage and no longer fails the check. Dangerous change
types for which no usage is recorded, such as a new enum value, keep failing regardless of usage.

Usage for an added argument is now measured on its field instead of on the new argument, which never
has any. Adding a required argument to a field that operations request therefore fails the check
instead of passing as safe based on usage, and the app deployments affected by it are reported.
