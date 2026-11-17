---
'hive': patch
---

Switch Node.js docker base images from debian bookworm to debian trixie (`node:<version>-trixie-slim`) and upgrade OS packages during image build.

Addresses [CVE-2026-85091](https://security-tracker.debian.org/tracker/CVE-2026-85091) (zlib heap buffer overflow), which has no fix available for bookworm.
