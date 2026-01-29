---
'hive': minor
---

Improve type sorting within the schema explorer. The changes are now sorted by relevance.

- Exact matches appear first (e.g., `Product` when searching `product`)
- Prefix matches appear second (e.g., `ProductInfo` when searching `prod`)
- Contains matches appear last, sorted alphabetically
