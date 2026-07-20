---
'hive': patch
---

Apply OS security updates to the base image at build time by adding `apt-get upgrade` to the service, migrations, and CLI Dockerfiles. Previously these only ran `apt-get update` followed by `apt-get install` of a few specific packages, so Debian security patches inherited from the pinned `node:*-slim` base were never applied — leaving published images with known-fixed CVEs. Bumping the base image tag alone does not fix this, since the latest `node` tag can still lag behind Debian's security updates.