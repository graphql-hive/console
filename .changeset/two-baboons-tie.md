---
'hive': minor
---

Add support for retrieving CDN artifacts by version ID.

New CDN endpoints allow fetching schema artifacts for a specific version:
- `/artifacts/v1/:targetId/version/:versionId/:artifactType`
- `/artifacts/v1/:targetId/version/:versionId/contracts/:contractName/:artifactType`

Artifacts are now written to both the latest path and a versioned path during schema publish, enabling retrieval of historical versions.
