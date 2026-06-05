---
'hive': patch
---

Fix issue where the user emails were not inserted in lower-case for OIDC providers returning non-lowercase emails.

If you are affected, you can manually fix you database state by running the following commands, to make account-linking from different login methods work smoothly.

```sql
UPDATE "users"
SET
  "email" = lower("email")
WHERE
  "email" <> lower("email")
;
```


```sql
UPDATE "supertokens_thirdparty_users"
SET
  "email" = lower("email")
WHERE
  "email" <> lower("email")
;
```


Fix issue where user emails were not inserted into the database in lowercase for invites, resulting in a mismatch of user account email and invite email that could not be accespted.
To cleanup your database of invites, run the following command to identify duplicate records and then manually fix them/clean them up.

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
