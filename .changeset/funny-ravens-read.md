---
'hive': patch
---

OIDC verification domains are now inserted and compared against lowercase domains. Any existing domains that use an uppercase letter must be converted to lowercase. This is to avoid an unnecessary convert to LOWER() in the SQL statements.

To convert existing domains, run the SQL query:
```
UPDATE oidc_integration_domains
SET domain_name=LOWER(domain_name)
WHERE domain_name != LOWER(domain_name)
;
```