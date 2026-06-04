---
'@graphql-hive/core': patch
---

Add `manifest` method to `createHive(...).persistedDocuments` for fetching a persisted documents manifests

```ts
const hive = createHive({
  persistedDocuments: {
    cdn: {
      endpoint: 'https://cdn.graphql-hive.com',
      accessToken: 'your-cdn-access-token',
    },
  },
  // ...
});

const manifest = await hive.persistedDocuments!.manifest({
  appName: 'my-app',
  appVersion: '1.0.0',
});

// manifest is null if not found, or:
// {
//   id: string
//   appName: string
//   appVersion: string
//   isActive: boolean
//   documentHashes: string[]
// }
```
