---
'hive': minor
---

Add configuration for specifying services listening host. It is now possible to specify on which
host the services are listening. Furthermore, the services can be configured to only listing on
IPv6.

The behaviour can be configrued via the two new environment variables `SERVER_HOST` and `SERVER_HOST_IPV6_ONLY` for each service.

```
SERVER_HOST="::"
SERVER_HOST_IPV6_ONLY="0"
```
