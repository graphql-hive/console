---
'hive': patch
---

Schema service: add 20 second and 45 second buckets to the composition duration histograms, and make `COMPOSITION_WORKER_COUNT` configurable from the environment. It was declared as a number, so any value set in the environment (always a string) failed validation on startup.
