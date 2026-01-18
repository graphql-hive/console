---
'@graphql-hive/cli': patch
'hive': patch
---

Fixes a bug in Federation composition and validation where an error was incorrectly reported for interfaces
implementing another interface with a `@key`. The validation now correctly applies only to object
types implementing the interface.
