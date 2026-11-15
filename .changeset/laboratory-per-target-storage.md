---
'hive': patch
---

The Laboratory now keeps its browser-saved state per target: tabs, operations, history, settings, environment variables, the preflight toggle and the Mock/API choice. Previously one shared copy was used across every target, project and organization, so an environment variable set on one target could be read by another target's preflight script. The first time each target is opened, it starts from the existing session, except environment variables and introspection headers, which are not carried over and need to be set again per target.
