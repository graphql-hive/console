# Hive Client for GraphQL Yoga

[Documentation](https://the-guild.dev/graphql/hive/docs/integrations/graphql-yoga)

---

[GraphQL Hive](https://the-guild.dev/graphql/hive) is a schema registry for GraphQL. With Hive you
manage and collaborate on all your GraphQL schemas and GraphQL workflows, regardless of the
underlying strategy, engine or framework you’re using: this includes Schema Stitching, Apollo
Federation, or just a traditional monolith approach.

> Hive and all of its components are developed and managed as an MIT open-source project.

---

## Migration from `@graphql-hive/client`

The `@graphql-hive/client` package has been deprecated in favor of library-specific packages.

1. Install the `@graphql-hive/yoga` package.
1. Remove the `@graphql-hive/client` package from your dependencies.
1. Replace `@graphql-hive/client` with `@graphql-hive/yoga` in your codebase.
1. Replace `useYogaHive` with `useHive`, and `createYogaHive` with `createHive` in your codebase.
1. Done
