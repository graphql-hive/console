---
'@graphql-hive/laboratory': patch
---

Hosts can hand persisted ids back to the lab: `onCollectionCreate` and
`onCollectionOperationCreate` may return `{ id }`, or a promise of it, and the lab adopts the id
for the collection, the saved operation, its working copy and its tab. Operations a collection is
created with are now reported through `onCollectionOperationCreate` as well. Before this, a
collection created in the current session kept a local id, so saving operations into it, renaming
it or deleting it could not reach the host's store until the page was reloaded.
