---
'hive': patch
---

Improve usage-service performance: 
- compression is now done with zstd instead of gzip
- report processing is more efficient now, we cache things cross-requests and significantly reduced CPU usage (4x more throughput)
