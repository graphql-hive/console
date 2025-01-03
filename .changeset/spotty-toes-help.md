---
'@graphql-hive/yoga': patch
---

- Upgrade to `graphql-yoga` >= `5.10.4`
- Improve graceful process termination on Node.js by leveraging `graphql-yoga`'s [dispose lifecycle hooks](https://the-guild.dev/graphql/yoga-server/docs/features/envelop-plugins#ondispose)
- Improve Cloudflare Worker runtime support by registering pending usage reporting requests using the [`waitUntil` API](https://developers.cloudflare.com/workers/runtime-apis/context/#waituntil)
- Use the logger instance from the `graphql-yoga` instance, for a more unified logging experience
- Use the `fetch` API implementation on the `graphql-yoga` instance for HTTP calls
- Replace the internal \`tiny-lru\` dependency with `graphql-yoga`'s internal LRU cache implementation