---
'hive': patch
---

Fix issue where contract composition marks types occuring in multiple subgraphs as `@inaccessible`
despite being used within the public API schema.
