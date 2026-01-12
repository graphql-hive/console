---
'hive': major
---

Add a new `workflows` service. This service consolidates and replaces the `emails` and `webhooks` services, using a Postgres-backed persistent queue for improved stability and reliability.

If you are running a self-hosted setup the following docker compose changes are required:

```diff
services:

+  workflows:
+    image: '${DOCKER_REGISTRY}workflows${DOCKER_TAG}'
+    networks:
+      - 'stack'
+    depends_on:
+      db:
+        condition: service_healthy
+    environment:
+      NODE_ENV: production
+      PORT: 3014
+      POSTGRES_HOST: db
+      POSTGRES_PORT: 5432
+      POSTGRES_DB: '${POSTGRES_DB}'
+      POSTGRES_USER: '${POSTGRES_USER}'
+      POSTGRES_PASSWORD: '${POSTGRES_PASSWORD}'
+      EMAIL_FROM: no-reply@graphql-hive.com
+      EMAIL_PROVIDER: sendmail
+      LOG_LEVEL: '${LOG_LEVEL:-debug}'
+      SENTRY: '${SENTRY:-0}'
+      SENTRY_DSN: '${SENTRY_DSN:-}'
+      PROMETHEUS_METRICS: '${PROMETHEUS_METRICS:-}'
+      LOG_JSON: '1'
-  emails:
-    ...
-  webhooks:
-    ...
```

For different setups, we recommend using this as a reference.

**Note:** The workflows service will attempt to run postgres migrations for seeding the required database tables within the `graphile_worker` namespace. Please make sure the database user has sufficient permissions. For more information please refer to the [Graphile Worker documentation](https://worker.graphile.org/).
