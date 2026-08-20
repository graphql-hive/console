---
'@graphql-hive/gateway-plugin-console-sdk': patch
'@graphql-hive/yoga': patch
---

Prevent validation failure by modifying selection set with hive specific typename aliases within
`onExecute` plugin hook instead of `onParse` hook.
