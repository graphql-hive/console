---
'@graphql-hive/cli': patch
---

Replace custom regex logic that stripped all spaces on publish. Use graphqljs' stripIgnoredCharacters
function instead. This maintains the useful spacing in multiline descriptions while stripping out other
unnecessary characters
