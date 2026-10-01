---
'hive': major
---

Replace `MutationdisableContract` mutation with `Mutation.deleteContract`, which permanently deletes contracts instead of soft-deleting them. Historical contract versions are retained and remain available from their schema versions.

Remove `Contract.isDisabled` and `Target.activeContracts`. Use `Target.contracts` as the single source of truth for existing contracts; legacy disabled contracts are excluded from this connection.
