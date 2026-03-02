---
'hive': patch
---

Adjust usage service's fallback client so that it impacts liveness only if the fallback queue fills up.
This should cause far fewer interruptions (spikes in 503s) due to kafka blips.