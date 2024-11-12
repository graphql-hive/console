## Hive plugin for Apollo-Router

This directory includes a Apollo-Router plugin for integrating with Hive.

At the moment, the following are implemented:

- [Fetching Supergraph from Hive CDN](https://the-guild.dev/graphql/hive/docs/high-availability-cdn)
- [Sending usage information](https://the-guild.dev/graphql/hive/docs/schema-registry/usage-reporting)
  from a running Apollo Router instance to Hive
- Persisted Operations using Hive's
  [App Deployments](https://the-guild.dev/graphql/hive/docs/schema-registry/app-deployments)

This project is constructed as a Rust project that implements Apollo-Router plugin interface.

This build of this project creates an artifact identical to Apollo-Router releases, with additional
features provided by Hive.

### Getting Started

[Please follow this guide and documentation for integrating Hive with Apollo Router](https://the-guild.dev/graphql/hive/docs/other-integrations/apollo-router)

### Development

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
