---
'@graphql-hive/core': minor
'@graphql-hive/apollo': minor
'@graphql-hive/envelop': minor
---

Introduce debug log level. HTTP retry log pollute the error log. The retries are now logged to the debug level.
In order to see debug logs set the `debug` option to true.

```ts
const hive = createHive({
  debug: true,
})
```

If you are using a custom logger, make sure to provide a `debug` logging method implementation.

```ts
const hive = createHive({
  debug: true,
  agent: {
    logger: {
      info() {},
      error() {},
      debug() {}
    }
  }
})
```
