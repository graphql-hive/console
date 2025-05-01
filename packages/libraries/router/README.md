# Hive plugin for Apollo-Router

[Hive](https://the-guild.dev/graphql/hive) is a fully open-source schema registry, analytics,
metrics and gateway for [GraphQL federation](https://the-guild.dev/graphql/hive/federation) and
other GraphQL APIs.

---

This project includes a Hive integration plugin for Apollo-Router.

At the moment, the following are implemented:

- [Fetching Supergraph from Hive CDN](https://the-guild.dev/graphql/hive/docs/high-availability-cdn)
- [Sending usage information](https://the-guild.dev/graphql/hive/docs/schema-registry/usage-reporting)
  from a running Apollo Router instance to Hive
- Persisted Operations using Hive's
  [App Deployments](https://the-guild.dev/graphql/hive/docs/schema-registry/app-deployments)

This project is constructed as a Rust project that implements Apollo-Router plugin interface.

This build of this project creates an artifact identical to Apollo-Router releases, with additional
features provided by Hive.

## Getting Started

### Binary/Docker

We provide a custom build of Apollo-Router that acts as a drop-in replacement, and adds Hive
integration to Apollo-Router.

[Please follow this guide and documentation for integrating Hive with Apollo Router](https://the-guild.dev/graphql/hive/docs/other-integrations/apollo-router)

### As a Library

If you are
[building a custom Apollo-Router with your own native plugins](https://www.apollographql.com/docs/graphos/routing/customization/native-plugins),
you can use the Hive plugin as a dependency from Crates.io:

```toml
[dependencies]
hive-apollo-router-plugin = "..."
```

And then in your codebase, make sure to import and register the Hive plugin:

```rs
use apollo_router::register_plugin;
// import the registry instance and the plugin registration function
use hive_apollo_router_plugin::registry::HiveRegistry;
// Import the usage plugin
use hive_apollo_router_plugin::usage::UsagePlugin;
// Import persisted documents plugin, if needed
use persisted_documents::PersistedDocumentsPlugin;


// In your main function, make sure to register the plugin before you create or initialize Apollo-Router
fn main() {
    // Register the Hive usage_reporting plugin
    register_plugin!("hive", "usage", UsagePlugin);
    // Register the persisted documents plugin, if needed
    register_plugin!("hive", "persisted_documents", PersistedDocumentsPlugin);

    // Initialize the Hive Registry instance and start the Apollo Router
    match HiveRegistry::new(None).and(apollo_router::main()) {
        Ok(_) => {}
        Err(e) => {
            eprintln!("{}", e);
            std::process::exit(1);
        }
    }
}
```

## Development

0. Install latest version of Rust
1. To get started with development, it is recommended to ensure Rust-analyzer extension is enabled
   on your VSCode instance.
2. Validate project status by running `cargo check`
3. To start the server with the demo config file (`./router.yaml`), use
   `cargo run -- --config router.yaml`. Make sure to set environment variables required for your
   setup and development process
   ([docs](https://the-guild.dev/graphql/hive/docs/other-integrations/apollo-router#configuration)).
4. You can also just run
   `cargo run -- --config router.yaml --log debug --dev --supergraph some.supergraph.graphql` for
   running it with a test supergraph file.
