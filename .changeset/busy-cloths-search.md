---
'hive-console-sdk-rs': minor
---

Breaking Changes to avoid future breaking changes;

Switch to [Builder](https://rust-unofficial.github.io/patterns/patterns/creational/builder.html) pattern for `SupergraphFetcher`, `PersistedDocumentsManager` and `UsageAgent` structs. 

No more `try_new` or `try_new_async` or `try_new_sync` functions, instead use `SupergraphFetcherBuilder`, `PersistedDocumentsManagerBuilder` and `UsageAgentBuilder` structs to create instances.

Benefits;

- No need to provide all parameters at once when creating an instance even for default values.

Example;
```rust
// Before
let fetcher = SupergraphFetcher::try_new_async(
        "SOME_ENDPOINT", // endpoint
         "SOME_KEY",
        "MyUserAgent/1.0".to_string(),
        Duration::from_secs(5), // connect_timeout
        Duration::from_secs(10), // request_timeout
        false, // accept_invalid_certs
        3, // retry_count
    )?;

// After
// No need to provide all parameters at once, can use default values
let fetcher = SupergraphFetcherBuilder::new()
    .endpoint("SOME_ENDPOINT".to_string())
    .key("SOME_KEY".to_string())
    .build_async()?;
```

- Easier to add new configuration options in the future without breaking existing code.

Example;

```rust
let fetcher = SupergraphFetcher::try_new_async(
        "SOME_ENDPOINT", // endpoint
         "SOME_KEY",
        "MyUserAgent/1.0".to_string(),
        Duration::from_secs(5), // connect_timeout
        Duration::from_secs(10), // request_timeout
        false, // accept_invalid_certs
        3, // retry_count
        circuit_breaker_config, // Breaking Change -> new parameter added
    )?;

let fetcher = SupergraphFetcherBuilder::new()
    .endpoint("SOME_ENDPOINT".to_string())
    .key("SOME_KEY".to_string())
    .build_async()?; // No breaking change, circuit_breaker_config can be added later if needed
```