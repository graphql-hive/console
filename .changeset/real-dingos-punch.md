---
'hive': patch
---

Fix issue where the organization invite email did not match the signed up user-accounts email.

To cleanup your database, run the following command to identify duplicate records and then manually fix them/clean them up.

```sql
SELECT
  "organization_id"
  , lower(email) AS key
  , array_agg(json_object(array['email', 'code', 'expires_at'], array["email", "code", to_json("expires_at")::text])) AS records
  , COUNT(*)
FROM
  "organization_invitations"
GROUP BY
  "organization_id", lower("email")
HAVING COUNT(*) > 1;
```
