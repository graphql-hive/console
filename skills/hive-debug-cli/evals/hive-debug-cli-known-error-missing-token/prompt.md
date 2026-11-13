---
tags: [hive-debug-cli]
max_turns: 20
timeout_seconds: 600
allowed_tools: [WebFetch]
---

I ran this and it failed, can you tell me why?

$ hive schema:publish schema.graphql --service accounts --url http://localhost:4001/graphql
Error 103: A registry token is required to perform the action.
