---
'@graphql-hive/laboratory': minor
---

Preflight scripts now see an allow-list of globals, the model the GraphiQL tab used: the
JavaScript built-ins, `fetch`, timers, `URL`, `TextEncoder`/`TextDecoder`, Web Crypto,
`Headers`/`Request`/`Response`, `AbortController`, `structuredClone`, `Intl`, typed arrays and
`CryptoJS`. Worker internals such as `self`, `globalThis`, `postMessage`, `importScripts`,
`location`, `navigator`, `indexedDB`, `caches`, `WebSocket`, `XMLHttpRequest`, `eval` and
`Function` read as `undefined`, and `this` is no longer the worker scope. The full list lives in
`src/lib/preflight-allowed-globals.ts`.
