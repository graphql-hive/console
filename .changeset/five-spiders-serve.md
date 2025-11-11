---
'@graphql-hive/core': patch
---

Allow to provide `version` to `AgentOptions` in Hive Client integrations.

```ts
createHive({
    agent: {
        name: 'my-custom-agent',
        version: '1.2.3', // new field
    },
})
```

Currently you can provide `name` but not `version`. This change allows to provide both `name` and `version` to better identify the clients connecting to Hive Console.
Previously the dependent libraries like Yoga, Envelop and Hive Gateway integrations were incorrectly sending their names with the version of `@graphql-hive/core` package. Now they will be able to send their own versions.