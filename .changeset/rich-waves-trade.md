---
'@graphql-hive/core': patch
---

Add `manifest` method to `createHive(...).persistedDocuments` for fetching a persisted documents (app deployment) manifest

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

const manifest = await hive.persistedDocuments?.manifest({
  appName: 'my-app',
  appVersion: '1.0.0',
});

// null if the app version does not exist, otherwise:
// {
//   id: 'some-uuid',          // unique identifier of the manifest
//   appName: 'my-app',        // app name
//   appVersion: '1.0.0',      // app version
//   isActive: true,           // whether this app version is published/active in Hive
//   documentHashes: [         // all persisted document hashes for this app version
//     'abc123',
//     'def456',
//   ],
// }
```
