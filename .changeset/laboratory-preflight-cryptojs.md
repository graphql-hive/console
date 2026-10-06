---
'@graphql-hive/laboratory': patch
---

Restore `lab.CryptoJS` in preflight scripts. It had been dropped from the `lab` object, so only the
bare `CryptoJS` global worked and scripts written for the GraphiQL tab failed on `lab.CryptoJS.*`,
even though the editor typings offered it. The typings also accept numbers, booleans and `null` in
`lab.environment.set`, as the runtime always did.
