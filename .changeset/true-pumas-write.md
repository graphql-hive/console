---
'hive': patch
---

Fix federation composition access validation on union members when selecting `__typename` in `@requires` directives.

The `@requires` directive validation rule (`AuthOnRequiresRule`) was not checking authorization requirements for `__typename` selections on and types. When `__typename` on a union type was selected, code would throw an unexpected error.
