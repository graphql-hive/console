---
'hive': minor
---

Remove the `tokens` service. Adjust the `server` and `usage` services to resolve the legacy target access tokens directly
from redis and postgres.

In order to update to this version remove the `tokens` entry within your docker compose file.

```diff
-     tokens:
-       image: '${DOCKER_REGISTRY}tokens${DOCKER_TAG}'
-       # ...
```

Then, make sure the `usage` service depends on the `db` container to be healthy.

```diff
     usage:
       # ...
       depends_on:
-        tokens:
+        db:
           condition: service_healthy
```
