---
'hive': patch
---

Do not cache edge types in graphql eslint. This fixes an issue where edge types were cached between
runs and only the cached edge types would be referenced for subsequent runs
