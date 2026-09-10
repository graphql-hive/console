---
'@graphql-hive/core': minor
---

Add `createDevFetcher`, a factory that composes a supergraph from local or remote subgraphs, with built-in caching to avoid recomposing when resolved service SDLs are unchanged. This allows a local gateway instance to automatically watch subgraphs, compose a supergraph, and set the schema using the result, which removes the need to run a separate instance of the Hive CLI.
