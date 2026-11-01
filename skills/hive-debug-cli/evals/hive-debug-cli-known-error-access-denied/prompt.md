---
tags: [hive-debug-cli]
max_turns: 20
timeout_seconds: 600
allowed_tools: [WebFetch]
---

hive-cli says access denied, but I thought my token was valid:

$ hive schema:publish schema.graphql --service billing --registry.accessToken abc123
Error 124: Access denied
