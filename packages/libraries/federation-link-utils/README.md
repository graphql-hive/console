# GraphQL Hive - federation-link-utils

[Hive](https://the-guild.dev/graphql/hive) is a fully open-source schema registry, analytics,
metrics and gateway for [GraphQL federation](https://the-guild.dev/graphql/hive/federation) and
other GraphQL APIs.

---

This library can be used to create custom features for GraphQL schemas backed by Federation's
[`@link`](https://www.apollographql.com/docs/graphos/reference/federation/directives#the-link-directive)
directive.

## Features

- Link version support.
- Import `as`/namespacing support that follows the [link spec](https://specs.apollo.dev/link/v1.0/).
- Only `graphql` as a peer dependency.

## Usage

This library is for power users who want to develop their own Federation 2 `@link` feature(s). It
enables you to define and support multiple versions of the feature and to easily reference the named
imports. This includes official federation features if you choose to implement them yourself.

```graphql
# schema.graphql

directive @example(eg: String!) on FIELD
extend schema @link(url: "https://specs.graphql-hive.com/example/v1.0", import: ["@example"])
type Query {
  user: User @example(eg: "query { user { id name } }")
}

type User {
  id: ID!
  name: String
}
```

```typescript
// specs.ts
import { extractLinkImplementations } from '@graphql-hive/federation-link-utils'

const typeDefs = parse(sdl)
const { matchesImplementation, resolveImportName } = extractLinkImplementations(typeDefs);
if (matchesImplementation('https://specs.graphql-hive.com/example', 'v1.0')) {
  const examples: Record<string, string> = {}
  const exampleName = resolveImportName('https://specs.graphql-hive.com/example', '@example')
  visit(typeDefs, {
    FieldDefinition: node => {
      const example = node.directives?.find(d => d.name.value === exampleName)
      if (example) {
        examples[node.name.value] = (
          example.arguments?.find(a => a.name.value === 'eg')?.value as
            | StringValueNode
            | undefined
        )?.value
      }
    }
  })
  return examples
}

// result[0] ==> { user: "query { user { id name } }"}
```
