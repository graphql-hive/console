---
'@graphql-hive/cli': minor
---

Add a `--header`/`-H` flag to `hive dev` to attach custom HTTP headers to the introspection
requests sent to locally running subgraphs. This allows introspecting subgraphs that require
authentication.

Headers are supplied in `key:value` format. The position of `--header` relative to `--service`
determines its scope:

- A `--header` specified **before** the first `--service` is global and applies to every service.
- A `--header` specified **after** a `--service` applies only to that service (until the next
  `--service`), and overrides a global header of the same name for that service.

Services provided via `--schema` are not introspected, so headers don't apply to them.

```shell
hive dev \
  --header 'X-Foo:shared-value' \
  --service reviews  --url http://localhost:3001/graphql --header 'Authorization:Bearer REVIEWS_TOKEN' \
  --service products --url http://localhost:3002/graphql --header 'Authorization:Bearer PRODUCTS_TOKEN'
```

In this example:

- `reviews` receives `X-Foo:shared-value` and `Authorization:Bearer REVIEWS_TOKEN`
- `products` receives `X-Foo:shared-value` and `Authorization:Bearer PRODUCTS_TOKEN`

**Note:** a `--header` placed after the *last* `--service` scopes only to that final service — it
is not treated as global. To apply a header to every service, place it before the first `--service`:

```shell
# ✅ applies to both reviews and products
hive dev --header 'X-Foo:shared-value' --service reviews --url ... --service products --url ...

# ⚠️ applies to `products` only, NOT to `reviews`
hive dev --service reviews --url ... --service products --url ... --header 'X-Foo:shared-value'
```
