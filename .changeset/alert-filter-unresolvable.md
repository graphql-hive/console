---
'hive': patch
---

Metric alert rules now say when the evaluator cannot apply their saved filter, for example when a subgraph the filter names is no longer in the latest schema version. The rules list and the rule's page show "Not evaluated" with the reason and since when, instead of leaving the rule silently frozen.
