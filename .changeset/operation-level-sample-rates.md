---
'@graphql-hive/core': minor
---

Add operation-level sample rates to the usage plugin via the new `sampleRates` option.

Each rule matches operations by exact `name` or by `regex` (tested against the operation name) and applies its own `sampleRate`. The first matching rule wins; operations that don't match any rule fall back to the global `sampleRate` (default `1.0`). This lets you sample known high-volume operations aggressively while keeping 100% visibility into low-volume operations, instead of choosing a single global rate that either overpays on quota or misses rare operations.

`exclude` still takes precedence (excluded operations are never reported), and `sampler`, when provided, continues to override both `sampleRate` and `sampleRates`.

```ts
usage: {
  sampleRate: 1.0, // fallback for unmatched operations
  sampleRates: [
    { name: 'SampledQuery', sampleRate: 0.1 },
    { regex: /^HighVolume/, sampleRate: 0.1 },
  ],
}
```
