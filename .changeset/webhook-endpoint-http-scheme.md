---
'hive': patch
---

Alert channel webhook endpoints must start with `http://` or `https://`. An endpoint without a scheme, such as `localhost:3000/webhook`, was accepted when creating, editing or testing a channel, and every request to it then failed with "Unexpected error".
