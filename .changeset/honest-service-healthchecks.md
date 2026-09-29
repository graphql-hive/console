---
hive: patch
---

Fix the Docker `HEALTHCHECK` of the service images. The probe command was never baked into the
image, so every service reported healthy right after starting. Containers now become healthy only
once their `/_readiness` endpoint responds, which makes `depends_on: service_healthy` and
`docker compose up --wait` wait for the services to actually be ready.
