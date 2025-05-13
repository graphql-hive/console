import { createComposeFederation } from '../federation';

test('contract: mutation type is not part of the public schema if all fields are excluded', async () => {
  const compose = createComposeFederation({
    decrypt: () => '',
    requestTimeoutMs: Infinity,
  });

  const sdl = /* GraphQL */ `
    schema @link(url: "https://specs.apollo.dev/federation/v2.3", import: ["@tag"]) {
      query: Query
      mutation: Mutation
    }

    type Query {
      field1: String!
    }

    type Mutation {
      field1: ID! @tag(name: "exclude")
    }
  `;

  const sdl2 = /* GraphQL */ `
    schema @link(url: "https://specs.apollo.dev/federation/v2.3", import: ["@tag"]) {
      query: Query
      mutation: Mutation
    }

    type Query {
      field2: String!
    }

    type Mutation {
      field2: ID! @tag(name: "exclude")
    }
  `;

  const result = await compose({
    contracts: [
      {
        filter: {
          include: null,
          exclude: ['exclude'],
          removeUnreachableTypesFromPublicApiSchema: true,
        },
        id: '1',
      },
    ],
    external: null,
    native: true,
    requestId: '1',
    schemas: [
      {
        raw: sdl,
        source: 'foo.graphql',
        url: 'https://lol.de',
      },
      {
        raw: sdl2,
        source: 'foo2.graphql',
        url: 'https://trolol.de',
      },
    ],
  });

  expect(result.type).toEqual('success');
  const contractResult = result.result.contracts?.at(0);
  expect(contractResult?.id).toEqual('1');
  expect(contractResult?.result.type).toEqual('success');
  expect(contractResult?.result.result.sdl).toMatchInlineSnapshot(`
    type Query {
      field1: String!
      field2: String!
    }
  `);
  expect(contractResult?.result.result.supergraph).toMatchInlineSnapshot(`
    schema @link(url: "https://specs.apollo.dev/link/v1.0") @link(url: "https://specs.apollo.dev/join/v0.3", for: EXECUTION) @link(url: "https://specs.apollo.dev/inaccessible/v0.2", for: SECURITY) {
      query: Query
      mutation: Mutation
    }

    directive @join__enumValue(graph: join__Graph!) repeatable on ENUM_VALUE

    directive @join__graph(name: String!, url: String!) on ENUM_VALUE

    directive @join__field(graph: join__Graph, requires: join__FieldSet, provides: join__FieldSet, type: String, external: Boolean, override: String, usedOverridden: Boolean) repeatable on FIELD_DEFINITION | INPUT_FIELD_DEFINITION

    directive @join__implements(graph: join__Graph!, interface: String!) repeatable on OBJECT | INTERFACE

    directive @join__type(graph: join__Graph!, key: join__FieldSet, extension: Boolean! = false, resolvable: Boolean! = true, isInterfaceObject: Boolean! = false) repeatable on OBJECT | INTERFACE | UNION | ENUM | INPUT_OBJECT | SCALAR

    directive @join__unionMember(graph: join__Graph!, member: String!) repeatable on UNION

    scalar join__FieldSet

    directive @link(url: String, as: String, for: link__Purpose, import: [link__Import]) repeatable on SCHEMA

    scalar link__Import

    enum link__Purpose {
      """
      \`SECURITY\` features provide metadata necessary to securely resolve fields.
      """
      SECURITY
      """
      \`EXECUTION\` features provide metadata necessary for operation execution.
      """
      EXECUTION
    }

    directive @inaccessible on FIELD_DEFINITION | OBJECT | INTERFACE | UNION | ENUM | ENUM_VALUE | SCALAR | INPUT_OBJECT | INPUT_FIELD_DEFINITION | ARGUMENT_DEFINITION

    enum join__Graph {
      FOO_GRAPHQL @join__graph(name: "foo.graphql", url: "https://lol.de")
      FOO2_GRAPHQL @join__graph(name: "foo2.graphql", url: "https://trolol.de")
    }

    type Query @join__type(graph: FOO_GRAPHQL) @join__type(graph: FOO2_GRAPHQL) {
      field1: String! @join__field(graph: FOO_GRAPHQL)
      field2: String! @join__field(graph: FOO2_GRAPHQL)
    }

    type Mutation @join__type(graph: FOO_GRAPHQL) @join__type(graph: FOO2_GRAPHQL) @inaccessible {
      field1: ID! @join__field(graph: FOO_GRAPHQL) @inaccessible
      field2: ID! @join__field(graph: FOO2_GRAPHQL) @inaccessible
    }
  `);
});

test('contract: mutation type is part of the public schema if not all fields are excluded', async () => {
  const compose = createComposeFederation({
    decrypt: () => '',
    requestTimeoutMs: Infinity,
  });

  const sdl = /* GraphQL */ `
    schema @link(url: "https://specs.apollo.dev/federation/v2.3", import: ["@tag"]) {
      query: Query
      mutation: Mutation
    }

    type Query {
      field1: String!
    }

    type Mutation {
      field1: ID! @tag(name: "exclude")
    }
  `;

  const sdl2 = /* GraphQL */ `
    schema @link(url: "https://specs.apollo.dev/federation/v2.3", import: ["@tag"]) {
      query: Query
      mutation: Mutation
    }

    type Query {
      field2: String!
    }

    type Mutation {
      field2: ID!
    }
  `;

  const result = await compose({
    contracts: [
      {
        filter: {
          include: null,
          exclude: ['exclude'],
          removeUnreachableTypesFromPublicApiSchema: true,
        },
        id: '1',
      },
    ],
    external: null,
    native: true,
    requestId: '1',
    schemas: [
      {
        raw: sdl,
        source: 'foo.graphql',
        url: 'https://lol.de',
      },
      {
        raw: sdl2,
        source: 'foo2.graphql',
        url: 'https://trolol.de',
      },
    ],
  });

  expect(result.type).toEqual('success');
  const contractResult = result.result.contracts?.at(0);
  expect(contractResult?.id).toEqual('1');
  expect(contractResult?.result.type).toEqual('success');
  expect(contractResult?.result.result.sdl).toMatchInlineSnapshot(`
    type Query {
      field1: String!
      field2: String!
    }

    type Mutation {
      field2: ID!
    }
  `);
  expect(contractResult?.result.result.supergraph).toMatchInlineSnapshot(`
    schema @link(url: "https://specs.apollo.dev/link/v1.0") @link(url: "https://specs.apollo.dev/join/v0.3", for: EXECUTION) @link(url: "https://specs.apollo.dev/inaccessible/v0.2", for: SECURITY) {
      query: Query
      mutation: Mutation
    }

    directive @join__enumValue(graph: join__Graph!) repeatable on ENUM_VALUE

    directive @join__graph(name: String!, url: String!) on ENUM_VALUE

    directive @join__field(graph: join__Graph, requires: join__FieldSet, provides: join__FieldSet, type: String, external: Boolean, override: String, usedOverridden: Boolean) repeatable on FIELD_DEFINITION | INPUT_FIELD_DEFINITION

    directive @join__implements(graph: join__Graph!, interface: String!) repeatable on OBJECT | INTERFACE

    directive @join__type(graph: join__Graph!, key: join__FieldSet, extension: Boolean! = false, resolvable: Boolean! = true, isInterfaceObject: Boolean! = false) repeatable on OBJECT | INTERFACE | UNION | ENUM | INPUT_OBJECT | SCALAR

    directive @join__unionMember(graph: join__Graph!, member: String!) repeatable on UNION

    scalar join__FieldSet

    directive @link(url: String, as: String, for: link__Purpose, import: [link__Import]) repeatable on SCHEMA

    scalar link__Import

    enum link__Purpose {
      """
      \`SECURITY\` features provide metadata necessary to securely resolve fields.
      """
      SECURITY
      """
      \`EXECUTION\` features provide metadata necessary for operation execution.
      """
      EXECUTION
    }

    directive @inaccessible on FIELD_DEFINITION | OBJECT | INTERFACE | UNION | ENUM | ENUM_VALUE | SCALAR | INPUT_OBJECT | INPUT_FIELD_DEFINITION | ARGUMENT_DEFINITION

    enum join__Graph {
      FOO_GRAPHQL @join__graph(name: "foo.graphql", url: "https://lol.de")
      FOO2_GRAPHQL @join__graph(name: "foo2.graphql", url: "https://trolol.de")
    }

    type Query @join__type(graph: FOO_GRAPHQL) @join__type(graph: FOO2_GRAPHQL) {
      field1: String! @join__field(graph: FOO_GRAPHQL)
      field2: String! @join__field(graph: FOO2_GRAPHQL)
    }

    type Mutation @join__type(graph: FOO_GRAPHQL) @join__type(graph: FOO2_GRAPHQL) {
      field1: ID! @join__field(graph: FOO_GRAPHQL) @inaccessible
      field2: ID! @join__field(graph: FOO2_GRAPHQL)
    }
  `);
});

test('contract: mutation type is not part of the public schema if no fields are included', async () => {
  const compose = createComposeFederation({
    decrypt: () => '',
    requestTimeoutMs: Infinity,
  });

  const sdl = /* GraphQL */ `
    schema @link(url: "https://specs.apollo.dev/federation/v2.3", import: ["@tag"]) {
      query: Query
      mutation: Mutation
    }

    type Query {
      field1: String! @tag(name: "include")
    }

    type Mutation {
      field1: ID!
    }
  `;

  const sdl2 = /* GraphQL */ `
    schema @link(url: "https://specs.apollo.dev/federation/v2.3", import: ["@tag"]) {
      query: Query
      mutation: Mutation
    }

    type Query {
      field2: String! @tag(name: "include")
    }

    type Mutation {
      field2: ID!
    }
  `;

  const result = await compose({
    contracts: [
      {
        filter: {
          include: ['include'],
          exclude: null,
          removeUnreachableTypesFromPublicApiSchema: true,
        },
        id: '1',
      },
    ],
    external: null,
    native: true,
    requestId: '1',
    schemas: [
      {
        raw: sdl,
        source: 'foo.graphql',
        url: 'https://lol.de',
      },
      {
        raw: sdl2,
        source: 'foo2.graphql',
        url: 'https://trolol.de',
      },
    ],
  });

  expect(result.type).toEqual('success');
  const contractResult = result.result.contracts?.at(0);
  expect(contractResult?.id).toEqual('1');
  expect(contractResult?.result.type).toEqual('success');
  expect(contractResult?.result.result.sdl).toMatchInlineSnapshot(`
    type Query {
      field1: String!
      field2: String!
    }
  `);
  expect(contractResult?.result.result.supergraph).toMatchInlineSnapshot(`
    schema @link(url: "https://specs.apollo.dev/link/v1.0") @link(url: "https://specs.apollo.dev/join/v0.3", for: EXECUTION) @link(url: "https://specs.apollo.dev/inaccessible/v0.2", for: SECURITY) {
      query: Query
      mutation: Mutation
    }

    directive @join__enumValue(graph: join__Graph!) repeatable on ENUM_VALUE

    directive @join__graph(name: String!, url: String!) on ENUM_VALUE

    directive @join__field(graph: join__Graph, requires: join__FieldSet, provides: join__FieldSet, type: String, external: Boolean, override: String, usedOverridden: Boolean) repeatable on FIELD_DEFINITION | INPUT_FIELD_DEFINITION

    directive @join__implements(graph: join__Graph!, interface: String!) repeatable on OBJECT | INTERFACE

    directive @join__type(graph: join__Graph!, key: join__FieldSet, extension: Boolean! = false, resolvable: Boolean! = true, isInterfaceObject: Boolean! = false) repeatable on OBJECT | INTERFACE | UNION | ENUM | INPUT_OBJECT | SCALAR

    directive @join__unionMember(graph: join__Graph!, member: String!) repeatable on UNION

    scalar join__FieldSet

    directive @link(url: String, as: String, for: link__Purpose, import: [link__Import]) repeatable on SCHEMA

    scalar link__Import

    enum link__Purpose {
      """
      \`SECURITY\` features provide metadata necessary to securely resolve fields.
      """
      SECURITY
      """
      \`EXECUTION\` features provide metadata necessary for operation execution.
      """
      EXECUTION
    }

    directive @inaccessible on FIELD_DEFINITION | OBJECT | INTERFACE | UNION | ENUM | ENUM_VALUE | SCALAR | INPUT_OBJECT | INPUT_FIELD_DEFINITION | ARGUMENT_DEFINITION

    enum join__Graph {
      FOO_GRAPHQL @join__graph(name: "foo.graphql", url: "https://lol.de")
      FOO2_GRAPHQL @join__graph(name: "foo2.graphql", url: "https://trolol.de")
    }

    type Query @join__type(graph: FOO_GRAPHQL) @join__type(graph: FOO2_GRAPHQL) {
      field1: String! @join__field(graph: FOO_GRAPHQL)
      field2: String! @join__field(graph: FOO2_GRAPHQL)
    }

    type Mutation @join__type(graph: FOO_GRAPHQL) @join__type(graph: FOO2_GRAPHQL) @inaccessible {
      field1: ID! @join__field(graph: FOO_GRAPHQL) @inaccessible
      field2: ID! @join__field(graph: FOO2_GRAPHQL) @inaccessible
    }
  `);
});

test('contract: mutation type is part of the public schema if at least one field is included', async () => {
  const compose = createComposeFederation({
    decrypt: () => '',
    requestTimeoutMs: Infinity,
  });

  const sdl = /* GraphQL */ `
    schema @link(url: "https://specs.apollo.dev/federation/v2.3", import: ["@tag"]) {
      query: Query
      mutation: Mutation
    }

    type Query {
      field1: String! @tag(name: "include")
    }

    type Mutation {
      field1: ID!
    }
  `;

  const sdl2 = /* GraphQL */ `
    schema @link(url: "https://specs.apollo.dev/federation/v2.3", import: ["@tag"]) {
      query: Query
      mutation: Mutation
    }

    type Query {
      field2: String! @tag(name: "include")
    }

    type Mutation {
      field2: ID! @tag(name: "include")
    }
  `;

  const result = await compose({
    contracts: [
      {
        filter: {
          include: ['include'],
          exclude: null,
          removeUnreachableTypesFromPublicApiSchema: true,
        },
        id: '1',
      },
    ],
    external: null,
    native: true,
    requestId: '1',
    schemas: [
      {
        raw: sdl,
        source: 'foo.graphql',
        url: 'https://lol.de',
      },
      {
        raw: sdl2,
        source: 'foo2.graphql',
        url: 'https://trolol.de',
      },
    ],
  });

  expect(result.type).toEqual('success');
  const contractResult = result.result.contracts?.at(0);
  expect(contractResult?.id).toEqual('1');
  expect(contractResult?.result.type).toEqual('success');
  expect(contractResult?.result.result.sdl).toMatchInlineSnapshot(`
    type Query {
      field1: String!
      field2: String!
    }

    type Mutation {
      field2: ID!
    }
  `);
  expect(contractResult?.result.result.supergraph).toMatchInlineSnapshot(`
    schema @link(url: "https://specs.apollo.dev/link/v1.0") @link(url: "https://specs.apollo.dev/join/v0.3", for: EXECUTION) @link(url: "https://specs.apollo.dev/inaccessible/v0.2", for: SECURITY) {
      query: Query
      mutation: Mutation
    }

    directive @join__enumValue(graph: join__Graph!) repeatable on ENUM_VALUE

    directive @join__graph(name: String!, url: String!) on ENUM_VALUE

    directive @join__field(graph: join__Graph, requires: join__FieldSet, provides: join__FieldSet, type: String, external: Boolean, override: String, usedOverridden: Boolean) repeatable on FIELD_DEFINITION | INPUT_FIELD_DEFINITION

    directive @join__implements(graph: join__Graph!, interface: String!) repeatable on OBJECT | INTERFACE

    directive @join__type(graph: join__Graph!, key: join__FieldSet, extension: Boolean! = false, resolvable: Boolean! = true, isInterfaceObject: Boolean! = false) repeatable on OBJECT | INTERFACE | UNION | ENUM | INPUT_OBJECT | SCALAR

    directive @join__unionMember(graph: join__Graph!, member: String!) repeatable on UNION

    scalar join__FieldSet

    directive @link(url: String, as: String, for: link__Purpose, import: [link__Import]) repeatable on SCHEMA

    scalar link__Import

    enum link__Purpose {
      """
      \`SECURITY\` features provide metadata necessary to securely resolve fields.
      """
      SECURITY
      """
      \`EXECUTION\` features provide metadata necessary for operation execution.
      """
      EXECUTION
    }

    directive @inaccessible on FIELD_DEFINITION | OBJECT | INTERFACE | UNION | ENUM | ENUM_VALUE | SCALAR | INPUT_OBJECT | INPUT_FIELD_DEFINITION | ARGUMENT_DEFINITION

    enum join__Graph {
      FOO_GRAPHQL @join__graph(name: "foo.graphql", url: "https://lol.de")
      FOO2_GRAPHQL @join__graph(name: "foo2.graphql", url: "https://trolol.de")
    }

    type Query @join__type(graph: FOO_GRAPHQL) @join__type(graph: FOO2_GRAPHQL) {
      field1: String! @join__field(graph: FOO_GRAPHQL)
      field2: String! @join__field(graph: FOO2_GRAPHQL)
    }

    type Mutation @join__type(graph: FOO_GRAPHQL) @join__type(graph: FOO2_GRAPHQL) {
      field1: ID! @join__field(graph: FOO_GRAPHQL) @inaccessible
      field2: ID! @join__field(graph: FOO2_GRAPHQL)
    }
  `);
});
