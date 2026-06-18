---
'hive': patch
---

Include contract changes in the GitHub CI schema-check summary. Previously, a `schema:check --github` run on a composite/federation project that changed only a contract (while the core composed schema was unchanged) was reported as "No changes". The summary now reports the changed contracts and their changes, and "No changes" is only shown when neither the core schema nor any contract changed.
