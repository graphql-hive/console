---
'@graphql-hive/cli': minor
---

Add custom HTTP headers to requests sent by the Hive CLI to the registry endpoint. This supports internal setups where the registry is available only through a proxy or gateway that requires additional authentication, tenant, routing, or network headers.

For persistent configuration, add a `headers` object to the `registry` section of `hive.json`:

```json
{
  "registry": {
    "endpoint": "https://hive.internal.example.com/graphql",
    "accessToken": "YOUR_HIVE_TOKEN",
    "headers": {
      "X-Internal-Proxy-Token": "YOUR_PROXY_TOKEN",
      "X-Tenant-ID": "engineering"
    }
  }
}
```

For one-off commands or CI environments, pass the repeatable `--registry.header` flag using `Name=Value` syntax:

```shell
hive schema:check schema.graphql \
  --registry.header 'X-Internal-Proxy-Token=YOUR_PROXY_TOKEN' \
  --registry.header 'X-Tenant-ID=engineering'
```

Headers supplied with `--registry.header` override headers with the same name from `hive.json`. The CLI-managed authorization and client identification headers cannot be overridden by custom headers.
