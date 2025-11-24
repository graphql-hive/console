---
'@graphql-hive/core': minor
'@graphql-hive/apollo': minor
'@graphql-hive/envelop': minor
'@graphql-hive/yoga': minor
---

Add support for providing a logger object via `HivePluginOptions`.

It is possible to provide the following options:

- **`'error'`** log errors
- **`'info'`** log errors and informal logs
- **`'debug'`** log errors, informal and debug logs

```ts
import { createHive } from '@graphql-hive/core'

const client = createHive({
  logger: 'info'
})
```

In addition to that, it is also possible to provide a error logging instance, where you can
customize how logs are forwarded.

```ts
import { createHive } from '@graphql-hive/core'

const client = createHive({
  logger: {
    info() {},
    error() {},
    debug() {}
  }
})
```

Deprecates the `HivePluginOptions.debug` option. Instead, please provide a logger with a `debug`
method.

```diff
 import { createHive } from '@graphql-hive/core'

 const client = createHive({
-  debug: process.env.DEBUG === "1",
+  logger: process.env.DEBUG === "1" ? "debug" : "info",
 })
```

Deprecate the `HivePluginOptions.agent.logger` option. Instead, please provide
`HivePluginOptions.logger`.

```diff
 import { createHive } from '@graphql-hive/core'

 const logger = {
   info() {},
   error() {},
   debug() {},
 };

 const client = createHive({
   agent: {
-    logger,
   },
+  logger,
 })
```
