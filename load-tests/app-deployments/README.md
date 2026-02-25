# App Deployment Benchmark: V1 vs V2 Format

Benchmark comparing v1 (legacy) and v2 (SHA256) storage formats for app deployments.

## Quick Start

```bash
# Run benchmark
npx tsx load-tests/app-deployments/run-benchmark.ts

# Run with multiple document counts
DOC_COUNT=1000 npx tsx load-tests/app-deployments/run-benchmark.ts
```

## Benchmark Results

### 1000 Documents

| Scenario   | Docs Uploaded    | Parse | Validate | Coords | ClickHouse | S3     | **Total** |
| ---------- | ---------------- | ----- | -------- | ------ | ---------- | ------ | --------- |
| V1 Initial | 1000             | 17ms  | 401ms    | 45ms   | 1790ms     | 8274ms | **9.1s**  |
| V2 Initial | 1000             | 10ms  | 276ms    | 48ms   | 936ms      | 7040ms | **7.6s**  |
| V2 Delta   | 50 (950 skipped) | 1ms   | 25ms     | 5ms    | 51ms       | 323ms  | **376ms** |

## Format Comparison

| Feature             | V1 (Legacy)                            | V2 (SHA256)                     |
| ------------------- | -------------------------------------- | ------------------------------- |
| Hash format         | Any alphanumeric                       | SHA256 only                     |
| Hash validation     | Format only                            | Format + content match          |
| S3 key              | `app/{target}/{name}/{version}/{hash}` | `app-v2/{target}/{name}/{hash}` |
| Cross-version dedup | No                                     | Yes                             |
| Delta uploads       | No                                     | Yes                             |

## Environment Variables

- `DOC_COUNT` - Number of documents in fixture (default: 1000)
- `REGISTRY_ENDPOINT` - GraphQL endpoint (default: http://localhost:3001/graphql)
- `REGISTRY_TOKEN` - Access token (default: local dev token)
- `TARGET` - Target slug (default: the-guild/hive/demo)
