---
'hive': minor
---

Add `Target.schemaPublishCount` to public GraphQL API to fetch insights into the amount of schema
publishes within a time period.

For installations with schema versions without the `origin` database column populated, set `SCHEMA_VERSION_ORIGIN_CUTOFF` to an ISO
timestamp representing the newest schema version without origin information.

Run the follwing query to determine whether you have schema versions without an `origin`:

```sql
SELECT
  to_json("created_at")
FROM
  "schema_versions"
WHERE
  "origin" IS NULL
ORDER BY 
  "created_at" DESC
LIMIT 1
```

If `null` is returned, no further action is required. Otherwise, set `SCHEMA_VERSION_ORIGIN_CUTOFF` to the returned ISO timestamp.

**Note**: When unset, publish counts use only schema version origin information, which can lead to inaccurate results if you have schema version records without `origin`.
