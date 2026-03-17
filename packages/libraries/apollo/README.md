# Hive Client for Apollo Server

[Hive](https://the-guild.dev/graphql/hive) is a fully open-source schema registry, analytics,
metrics and gateway for [GraphQL federation](https://the-guild.dev/graphql/hive/federation) and
other GraphQL APIs.

---

[Documentation](https://the-guild.dev/graphql/hive/docs/other-integrations/apollo-server)

## Migration from `@graphql-hive/client`

The `@graphql-hive/client` package has been deprecated in favor of library-specific packages.

1. Install the `@graphql-hive/apollo` package.
1. Remove the `@graphql-hive/client` package from your dependencies.
1. Replace `@graphql-hive/client` with `@graphql-hive/apollo` in your codebase.
1. Replace `hiveApollo` with `useHive` in your codebase.
1. Done
