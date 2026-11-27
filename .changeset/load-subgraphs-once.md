---
'hive': patch
---

Schema check, publish and delete load fewer subgraph SDLs. They loaded the SDL of every subgraph
twice: once for the latest schema version and once for the latest composable version. The latest
composable version's subgraph SDLs are now only loaded for old versions that do not store their
composed schema.

Deleting a subgraph now detects service URL changes against the latest composable version, as
publishing a subgraph does. Before, it compared against the latest version, even when that version
failed to compose.
