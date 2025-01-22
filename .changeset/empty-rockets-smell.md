---
'hive': minor
---

You can now set HTTP headers in your Console Laboratory Preflight Script. Every time you run a request from Laboratory, your preflight headers, if any, will be merged into the request before it is sent.

You achieve this by interacting with the [`Headers`](https://developer.mozilla.org/docs/web/api/headers) instance newly available at `lab.request.headers`. For example, this script would would add a `foo` header with the value `bar` to every Laboratory request.

```ts
lab.request.headers.set('foo', 'bar')
```

A few notes about how headers are merged:

1. Unlike static headers, preflight headers do not receive environment variable substitutions on their values.
2. Preflight headers take precedence, overwriting any same-named headers already in the Laboratory request.
