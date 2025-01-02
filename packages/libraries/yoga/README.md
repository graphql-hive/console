# Hive Client for GraphQL Yoga

[Hive](https://the-guild.dev/graphql/hive) is a fully open-source schema registry, analytics,
metrics and gateway for [GraphQL federation](https://the-guild.dev/graphql/hive/federation) and
other GraphQL APIs.

---

[Documentation](https://the-guild.dev/graphql/hive/docs/other-integrations/graphql-yoga)

## Migration from `@graphql-hive/client`

The `@graphql-hive/client` package has been deprecated in favor of library-specific packages.

1. Install the `@graphql-hive/yoga` package.
1. Remove the `@graphql-hive/client` package from your dependencies.
1. Replace `@graphql-hive/client` with `@graphql-hive/yoga` in your codebase.
1. Replace `useYogaHive` with `useHive`, and `createYogaHive` with `createHive` in your codebase.
1. Done
