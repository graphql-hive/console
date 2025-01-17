---
'hive': minor
---

Show Impact metric in the Operations list on the Insights page.
Impact equals to the total time spent (p95) on this operation in the selected period in seconds.
It helps assess which operations contribute the most to overall latency.


```
Impact = Requests * p95/1000
```
