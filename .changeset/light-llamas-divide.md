---
'@graphql-hive/apollo': patch
---

Prevent GraphQL document with selection set not satisfiable by the server to cause unhandled
rejections for Apollo Server v3 (see https://github.com/graphql-hive/console/pull/4958 and https://github.com/graphql-hive/console/issues/4935).
