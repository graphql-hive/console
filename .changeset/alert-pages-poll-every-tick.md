---
'hive': patch
---

The alert channel page and the alert rule detail page refresh their delivery log and state log every 15 seconds again. They used to refresh only when the clock crossed the hour (the channel page) or the minute (the rule page), because the hour- and minute-aligned window the query asks for only changes then.
