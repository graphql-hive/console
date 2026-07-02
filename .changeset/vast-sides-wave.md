---
'@graphql-hive/yoga': patch
---

Use original operation document when usage reporting

Some envelop plugins (like extended-validation) mutate documents in place and can therefore cause the document to be different AFTER execution than the one that was used FOR execution. To avoid this rugpull, we create a new stable document operation (object) for usage reporting.
