---
'@graphql-hive/cli': minor
'hive': minor
---

Add v2 storage format for app deployments with delta uploads support. The v2 format uses SHA256 content-addressed hashes enabling cross-version document deduplication - only new documents are uploaded, existing ones are skipped. This can reduce upload times by up to 24x for deployments with mostly unchanged documents.
