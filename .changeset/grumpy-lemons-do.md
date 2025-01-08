---
'hive': minor
---

Adds a response validation of the POST https://slack.com/api/oauth.v2.access request.

This request is made when connecting Slack to Hive. This is to ensure that the response is a JSON object and that it contains the expected keys and provide informative error messages if it does not.
