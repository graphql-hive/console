---
'@graphql-hive/yoga': patch
---

Align with GraphQL Yoga >=5.10.4 which has the relevant features mentioned below;

- Remove \`tiny-lru\` dependency, and use `createLruCache` from `graphql-yoga`
- - Yoga already provides a LRU cache implementation, so we can use that instead of having a separate dependency
- Use Explicit Resource Management of GraphQL Yoga plugins for disposal which already respect Node.js process termination
- - The feature has been implemented in `@whatwg-node/server` which is used by GraphQL Yoga. [Learn more about this feature](https://github.com/ardatan/whatwg-node/pull/1830)
- Use \`context.waitUntil\` which is handled by the environment automatically, if not `@whatwg-node/server` already takes care of it with above.
- - The feature has been implemented in `@whatwg-node/server` which is used by GraphQL Yoga. [Learn more about this feature](
    https://github.com/ardatan/whatwg-node/pull/1830)
- Respect the given `fetchAPI` by GraphQL Yoga(might be Hive Gateway) for the `fetch` function
- - Hive Gateway uses `fetchAPI` given to GraphQL Yoga for the entire Fetch API implementation, so if Hive Client respects that, we have a control over HTTP calls done internally by the gateway
- Respect Yoga's \`logger\` for logging
- - Similar to above, we want to respect the logger provided by Yoga to have a better control over logging