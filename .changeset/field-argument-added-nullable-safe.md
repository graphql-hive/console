---
'hive': patch
---

Adding a nullable argument without a default value to an existing field is now reported as a safe
change in schema checks and publishes, so it is no longer subject to the target's dangerous-change
settings: existing operations stay valid and the field receives no value for the argument, exactly as
before. Adding an argument with a default value remains dangerous, and adding a non-null argument
without a default value remains breaking. The `severityReason` of a `FIELD_ARGUMENT_ADDED` change now
explains why it was given its severity.
