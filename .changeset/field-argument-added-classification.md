---
'hive': patch
---

Schema checks classify added field arguments more precisely. Adding a nullable argument without a
default value is now a safe change; adding one with a default value stays dangerous, and adding a
required argument stays breaking. The change's `severityReason` explains the level.

Usage is now measured on the field an argument is added to, and dangerous changes a target is set to
fail on are checked against usage like breaking changes where usage is recorded. As a result, a
defaulted argument added to a field no operation requests passes as safe based on usage, while a
required argument added to a field operations request fails instead of passing.
