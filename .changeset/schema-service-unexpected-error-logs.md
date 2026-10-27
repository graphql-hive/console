---
'hive': patch
---

The schema service now logs unexpected composition errors with the request id, the composition task id and the error stack. Previously such errors were logged as "Composition timed out" without the error, and the worker's log line carried no request id.
