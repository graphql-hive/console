---
'hive': patch
---

Stop writing the deprecated `schema_log.target_id` column when promoting schema versions. A new
PostgreSQL migration replaces the `schema_log_by_commit_ordered` index with
`schema_log_by_project_commit_ordered` on `(project_id, commit, created_at DESC)`, which matches
the schema version lookup by commit, and drops the unused `schema_log_target_id` index. This
prepares the column for removal in a future release.
