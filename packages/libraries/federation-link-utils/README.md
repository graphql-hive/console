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
- Only `graphql` as a dependency.

## Usage

This library is for power users who want to develop their own Federation 2 `@link` feature(s). It
enables you to define and support multiple versions of the feature and to easily reference the named
imports. This includes official federation features if you choose to implement them yourself.

```graphql
# schema.graphql

directive @example(eg: String!) on FIELD
extend schema @link(url: "https://specs.graphql-hive.com/example/v0.1", import: ["@example"])
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
import {
  detectLinkedImplementations,
  FEDERATION_V1,
  LinkableSpec
} from '@graphql-hive/federation-link-utils'

const exampleSpec = new LinkableSpec('https://specs.graphql-hive.com/example', {
  [FEDERATION_V1]: resolveImportName => (typeDefs: DocumentNode) => {
    // option to support federation 1 schemas. Be extremely cautious here because versioning
    // cannot be done safely.
  },
  v0_1: resolveImportName => (typeDefs: DocumentNode) => {
    const examples: Record<string, string> = {}
    const exampleName = resolveImportName('@example')
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
})
const typeDefs = parse(sdl)
const linkedSpecs = detectLinkedImplementations(typeDefs, [exampleSpec])
const result = linkedSpecs.map(apply => apply(typeDefs))

// result[0] ==> { user: "query { user { id name } }"}
```

The LinkableSpec is unopinionated on how the spec is implemented. However, it's recommended to keep
this consistent between all LinkedSpecs. I.e. always return a yoga plugin.
