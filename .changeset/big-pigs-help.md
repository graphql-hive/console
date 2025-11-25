---
'@graphql-hive/core': minor
'@graphql-hive/apollo': minor
'@graphql-hive/envelop': minor
'@graphql-hive/yoga': minor
---

Add support for providing a logger object via `HivePluginOptions`.

It is possible to provide the following options:

- **'trace'**
- **'debug'**
- **'info'** default
- **'warn'**
- **'error'**

```ts
import { createHive } from '@graphql-hive/core'

const client = createHive({
  logger: 'info'
})
```

In addition to that, it is also possible to provide a Hive Logger instance, that allows more control over how you want to log and forward logs.

```ts
import { createHive } from '@graphql-hive/core'
import { Logger } from '@graphql-hive/logger'

const client = createHive({
  logger: new Logger()
})
```

Head to our [Hive Logger documentation](https://the-guild.dev/graphql/hive/docs/logger) to learn more.

___

**The `HivePluginOptions.debug` option is now deprecated.** Instead, please provide the option `debug`
instead for the logger.

```diff
 import { createHive } from '@graphql-hive/core'

 const client = createHive({
-  debug: process.env.DEBUG === "1",
+  logger: process.env.DEBUG === "1" ? "debug" : "info",
 })
```

**Note**: If the `logger` property is provided, the `debug` option is ignored.

___

**The `HivePluginOptions.agent.logger` option is now deprecated.** Instead, please provide
`HivePluginOptions.logger`.

```diff
 import { createHive } from '@graphql-hive/core'

 const logger = new Logger()

 const client = createHive({
   agent: {
-    logger,
   },
+  logger,
 })
```

**Note**: If both options are provided, the `agent` option is ignored.
