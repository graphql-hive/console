---
'hive': patch
---

Updating a target's base schema (schema extensions) now rejects SDL that does not parse, instead of accepting it and breaking every following schema check and publish on that target.
