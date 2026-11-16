---
'hive': patch
---

Schema checks classify added field arguments more precisely. Adding a nullable argument without a
default value is now a safe change; adding one with a default value stays dangerous, and adding a
required argument stays breaking. The change's `severityReason` explains the level.

With conditional breaking changes enabled, usage is applied to these changes differently. In a
schema check this decides whether the check passes. On a schema publish it decides whether the
change is recorded as safe based on usage; a publish is still never rejected for these changes.

- An added argument is measured by the usage of its field. Usage was previously looked up on the
  new argument, which no operation can use yet, so a required argument was always safe based on
  usage. Adding one to a field that operations request now fails the check.
- A dangerous change that the target is set to fail on is measured against usage the same way a
  breaking change is. For example, adding an argument with a default value to a field that no
  operation requests is now safe based on usage, and the check passes. Dangerous changes whose
  usage is not recorded, such as an added enum value, still fail the check.
