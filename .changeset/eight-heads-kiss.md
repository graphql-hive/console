---
'hive': minor
---

Replace MinIO with versitygw in the docker compose files, since MinIO's docker images are no longer
published. The S3 data volume moves from `.hive/minio` to `.hive/versitygw`; existing objects are
not migrated.

The S3 credentials the community compose file reads from your `.env` are renamed:

1. Rename `MINIO_ROOT_USER` to `S3_ROOT_USER`
2. Rename `MINIO_ROOT_PASSWORD` to `S3_ROOT_PASSWORD`

The old names are no longer read, so the S3 service and the server would otherwise start with empty
credentials.
