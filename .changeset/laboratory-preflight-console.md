---
'@graphql-hive/laboratory': patch
---

Preflight console arguments are converted to text inside the worker, so logging a function, `lab`
or `lab.request.headers` no longer fails the run with a clone error. A script that throws a
non-Error value now reports it instead of waiting for the timeout.
