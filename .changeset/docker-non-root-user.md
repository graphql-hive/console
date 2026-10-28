---
'hive': minor
---

The OpenTelemetry collector docker image now run as the unprivileged user with UID `1000` instead of `root`.

No changes are required for the default `docker-compose` or Kubernetes setups. You may need to adjust
your setup if you:

- build custom images on top of the Hive images and install packages or certificates (switch to
  `USER root` for those steps and back to `USER 1000` afterwards)
- mount files into the containers that are only readable by `root` (e.g. custom CA certificates or
  secrets with mode `600`); make them readable by UID `1000`
