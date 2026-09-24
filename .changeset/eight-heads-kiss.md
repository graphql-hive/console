---
'hive': minor
---

Replace MinIO with versitygw in the docker compose files, since MinIO's docker images are no longer
published. The S3 data volume moves from `.hive/minio` to `.hive/versitygw`; existing objects are
not migrated.
