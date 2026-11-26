/**
 * Baseline coverage of the schema explorer, the unused schema and the deprecated schema:
 * the types, fields, arguments, enum values, union members and input fields they expose, with
 * descriptions, default values, deprecations, usage, subgraph ownership and schema metadata.
 *
 * The full responses are compared against snapshots, so any change in what these APIs return
 * shows up as a snapshot diff.
 */
import { addDays, formatISO, subDays } from 'date-fns';
import { graphql, useFragment } from 'testkit/gql';
import { ProjectType } from 'testkit/gql/graphql';
import { execute } from 'testkit/graphql';
import { initSeed } from 'testkit/seed';
import { invariant } from '@hive/service-common';

const NamedTypeFragment = graphql(/* GraphQL */ `
  fragment IntegrationTestsExplorer_NamedType on GraphQLNamedType {
    __typename
    name
    description
    usage {
      total
      isUsed
      usedByClients
      topOperations(limit: 5) {
        name
        hash
        count
      }
    }
    supergraphMetadata {
      ownedByServiceNames
      metadata {
        name
        content
        source
      }
    }
    ... on GraphQLObjectType {
      interfaces
      fields {
        name
        description
        type
        isDeprecated
        deprecationReason
        usage {
          total
          isUsed
          usedByClients
        }
        supergraphMetadata {
          ownedByServiceNames
          metadata {
            name
            content
            source
          }
        }
        args {
          name
          description
          type
          defaultValue
          isDeprecated
          deprecationReason
          usage {
            total
            isUsed
            usedByClients
          }
        }
      }
    }
    ... on GraphQLInterfaceType {
      interfaces
      fields {
        name
        description
        type
        isDeprecated
        deprecationReason
        usage {
          total
          isUsed
          usedByClients
        }
        supergraphMetadata {
          ownedByServiceNames
          metadata {
            name
            content
            source
          }
        }
        args {
          name
          description
          type
          defaultValue
          isDeprecated
          deprecationReason
          usage {
            total
            isUsed
            usedByClients
          }
        }
      }
    }
    ... on GraphQLUnionType {
      members {
        name
        usage {
          total
          isUsed
          usedByClients
        }
        supergraphMetadata {
          ownedByServiceNames
        }
      }
    }
    ... on GraphQLEnumType {
      values {
        name
        description
        isDeprecated
        deprecationReason
        usage {
          total
          isUsed
          usedByClients
        }
        supergraphMetadata {
          ownedByServiceNames
        }
      }
    }
    ... on GraphQLInputObjectType {
      fields {
        name
        description
        type
        defaultValue
        isDeprecated
        deprecationReason
        usage {
          total
          isUsed
          usedByClients
        }
        supergraphMetadata {
          ownedByServiceNames
        }
      }
    }
  }
`);

const ExplorerQuery = graphql(/* GraphQL */ `
  query IntegrationTestsExplorer(
    $targetRef: TargetReferenceInput!
    $usage: SchemaExplorerUsageInput
  ) {
    latestValidVersion(target: $targetRef) {
      explorer(usage: $usage) {
        subgraphNames
        metadataAttributes {
          name
          values
        }
        query {
          ...IntegrationTestsExplorer_NamedType
        }
        mutation {
          ...IntegrationTestsExplorer_NamedType
        }
        subscription {
          ...IntegrationTestsExplorer_NamedType
        }
        types {
          ...IntegrationTestsExplorer_NamedType
        }
        user: type(name: "User") {
          ...IntegrationTestsExplorer_NamedType
        }
        role: type(name: "Role") {
          ...IntegrationTestsExplorer_NamedType
        }
        missing: type(name: "DoesNotExist") {
          __typename
        }
      }
    }
  }
`);

const UnusedSchemaQuery = graphql(/* GraphQL */ `
  query IntegrationTestsExplorerUnusedSchema(
    $targetRef: TargetReferenceInput!
    $period: DateRangeInput!
  ) {
    latestValidVersion(target: $targetRef) {
      unusedSchema(period: { absoluteRange: $period }) {
        types {
          ...IntegrationTestsExplorer_NamedType
        }
      }
    }
  }
`);

const DeprecatedSchemaQuery = graphql(/* GraphQL */ `
  query IntegrationTestsExplorerDeprecatedSchema(
    $targetRef: TargetReferenceInput!
    $period: DateRangeInput!
  ) {
    latestValidVersion(target: $targetRef) {
      deprecatedSchema(period: { absoluteRange: $period }) {
        types {
          ...IntegrationTestsExplorer_NamedType
        }
      }
    }
  }
`);

const CoordinateOwnersQuery = graphql(/* GraphQL */ `
  query IntegrationTestsExplorerCoordinateOwners(
    $targetRef: TargetReferenceInput!
    $period: DateRangeInput!
  ) {
    target(reference: $targetRef) {
      user: schemaCoordinateStats(period: $period, schemaCoordinate: "User") {
        supergraphMetadata {
          ownedByServiceNames
          metadata {
            name
            content
            source
          }
        }
      }
      userPosts: schemaCoordinateStats(period: $period, schemaCoordinate: "User.posts") {
        supergraphMetadata {
          ownedByServiceNames
          metadata {
            name
            content
            source
          }
        }
      }
      queryUser: schemaCoordinateStats(period: $period, schemaCoordinate: "Query.user") {
        supergraphMetadata {
          ownedByServiceNames
          metadata {
            name
            content
            source
          }
        }
      }
      roleAdmin: schemaCoordinateStats(period: $period, schemaCoordinate: "Role.ADMIN") {
        supergraphMetadata {
          ownedByServiceNames
          metadata {
            name
            content
            source
          }
        }
      }
      unknown: schemaCoordinateStats(period: $period, schemaCoordinate: "Unknown.field") {
        supergraphMetadata {
          ownedByServiceNames
          metadata {
            name
            content
            source
          }
        }
      }
    }
  }
`);

/** Covers every type kind, arguments and input fields with default values, and deprecations. */
const singleSdl = /* GraphQL */ `
  """
  The root query.
  """
  type Query {
    "Looks up a user."
    user(id: ID!, "Also returns deleted users." includeDeleted: Boolean = false): User
    users(first: Int = 10, after: String, filter: UserFilter, order: Order = ASC): [User!]!
    search(term: String!): [SearchResult!]!
    node(id: ID!): Node
    legacyField: String @deprecated(reason: "Use user instead.")
    withDeprecatedArgument(old: Int @deprecated(reason: "Use current."), current: Int): Int
    now: DateTime
  }

  type Mutation {
    createUser(input: CreateUserInput!): User
  }

  type Subscription {
    userCreated: User
  }

  "An object with an id."
  interface Node {
    id: ID!
  }

  interface Named implements Node {
    id: ID!
    name: String
  }

  "A user."
  type User implements Node & Named {
    id: ID!
    name: String
    role: Role
    oldName: String @deprecated
    posts(first: Int = 5): [Post!]!
  }

  type Post implements Node {
    id: ID!
    title: String
    author: User
  }

  "Either a user or a post."
  union SearchResult = User | Post

  "The role of a user."
  enum Role {
    ADMIN
    "A regular user."
    USER
    GUEST @deprecated(reason: "Guests are no longer supported.")
  }

  enum Order {
    ASC
    DESC
  }

  input UserFilter {
    name: String = "anonymous"
    role: Role = USER
    roles: [Role!] = [ADMIN]
    nested: NestedFilter = { limit: 3 }
    legacy: String @deprecated(reason: "No longer used.")
  }

  input NestedFilter {
    limit: Int = 1
  }

  "The data to create a user."
  input CreateUserInput {
    name: String!
    role: Role = USER
  }

  "A date and time in ISO 8601."
  scalar DateTime
`;

const usersSubgraph = /* GraphQL */ `
  extend schema
    @link(url: "https://specs.apollo.dev/federation/v2.3", import: ["@key"])
    @link(url: "https://specs.graphql-hive.com/hive/v1.0", import: ["@meta"])
    @meta(name: "team", content: "users")

  directive @meta(
    name: String!
    content: String!
  ) repeatable on SCHEMA | OBJECT | INTERFACE | FIELD_DEFINITION

  type Query {
    user(id: ID!): User @meta(name: "priority", content: "high")
  }

  type User @key(fields: "id") @meta(name: "domain", content: "identity") {
    id: ID!
    name: String @deprecated(reason: "Use fullName.")
    fullName: String
    role: Role
  }

  enum Role {
    ADMIN
    USER
  }
`;

const postsSubgraph = /* GraphQL */ `
  extend schema
    @link(url: "https://specs.apollo.dev/federation/v2.3", import: ["@key"])
    @link(url: "https://specs.graphql-hive.com/hive/v1.0", import: ["@meta"])
    @meta(name: "team", content: "posts")

  directive @meta(
    name: String!
    content: String!
  ) repeatable on SCHEMA | OBJECT | INTERFACE | FIELD_DEFINITION

  type Query {
    posts(first: Int = 10): [Post!]!
    feed: [FeedItem!]!
  }

  type Post @key(fields: "id") {
    id: ID!
    title: String
    author: User
  }

  type User @key(fields: "id") {
    id: ID!
    posts: [Post!]!
  }

  union FeedItem = Post

  enum Role {
    ADMIN
    USER
  }
`;

const period = () => ({
  from: formatISO(subDays(new Date(), 7)),
  to: formatISO(addDays(new Date(), 1)),
});

/** Type name to its fields, values or members, for compact assertions. */
function outline(types: ReadonlyArray<unknown>) {
  return Object.fromEntries(
    types.map(maskedType => {
      const type = useFragment(NamedTypeFragment, maskedType as never);
      switch (type.__typename) {
        case 'GraphQLObjectType':
        case 'GraphQLInterfaceType':
          return [
            type.name,
            type.fields.map(field =>
              field.args.length
                ? `${field.name}(${field.args.map(arg => arg.name).join(', ')})`
                : field.name,
            ),
          ];
        case 'GraphQLInputObjectType':
          return [type.name, type.fields.map(field => field.name)];
        case 'GraphQLEnumType':
          return [type.name, type.values.map(value => value.name)];
        case 'GraphQLUnionType':
          return [type.name, type.members.map(member => member.name)];
        default:
          return [type.name, []];
      }
    }),
  );
}

async function singleProject(options: { withUsage: boolean }) {
  const { createOrg } = await initSeed().createOwner();
  const { createProject } = await createOrg();
  const { createTargetAccessToken, target, waitForOperationsCollected } = await createProject(
    ProjectType.Single,
  );
  const token = await createTargetAccessToken({});
  const published = await token
    .publishSchema({ sdl: singleSdl })
    .then(r => r.expectNoGraphQLErrors());
  expect(published.schemaPublish.__typename).toBe('SchemaPublishSuccess');

  if (options.withUsage) {
    const collected = await token.collectLegacyOperations([
      {
        timestamp: Date.now(),
        operation: 'query GetUser { user(id: "1") { id name role } }',
        operationName: 'GetUser',
        fields: [
          'Query',
          'Query.user',
          'Query.user.id',
          'ID',
          'User',
          'User.id',
          'User.name',
          'User.role',
          'Role',
        ],
        execution: { ok: true, duration: 200_000_000, errorsTotal: 0 },
        metadata: { client: { name: 'web', version: '1.0.0' } },
      },
      {
        timestamp: Date.now(),
        operation: 'query Admins { users(filter: { role: ADMIN }) { id } }',
        operationName: 'Admins',
        fields: [
          'Query',
          'Query.users',
          'Query.users.filter',
          'UserFilter',
          'UserFilter.role',
          'Role',
          'Role.ADMIN',
          'User',
          'User.id',
        ],
        execution: { ok: true, duration: 200_000_000, errorsTotal: 0 },
        metadata: { client: { name: 'mobile', version: '2.0.0' } },
      },
    ]);
    expect(collected.status).toEqual(200);
    await waitForOperationsCollected(2);
  }

  return { target, token };
}

async function federatedProject() {
  const { createOrg } = await initSeed().createOwner();
  const { createProject } = await createOrg();
  const { createTargetAccessToken, target } = await createProject(ProjectType.Federation);
  const token = await createTargetAccessToken({});
  for (const [service, sdl] of [
    ['users', usersSubgraph],
    ['posts', postsSubgraph],
  ] as const) {
    const published = await token
      .publishSchema({ sdl, service, url: `http://${service}.localhost:4000/graphql` })
      .then(r => r.expectNoGraphQLErrors());
    expect(published.schemaPublish.__typename).toBe('SchemaPublishSuccess');
  }
  return { target, token };
}

function explorer(target: { id: string }, token: { secret: string }) {
  return execute({
    document: ExplorerQuery,
    variables: { targetRef: { byId: target.id }, usage: { period: period() } },
    authToken: token.secret,
  }).then(r => r.expectNoGraphQLErrors());
}

function unusedSchema(target: { id: string }, token: { secret: string }) {
  return execute({
    document: UnusedSchemaQuery,
    variables: { targetRef: { byId: target.id }, period: period() },
    authToken: token.secret,
  }).then(r => r.expectNoGraphQLErrors());
}

function deprecatedSchema(target: { id: string }, token: { secret: string }) {
  return execute({
    document: DeprecatedSchemaQuery,
    variables: { targetRef: { byId: target.id }, period: period() },
    authToken: token.secret,
  }).then(r => r.expectNoGraphQLErrors());
}

describe('schema explorer', () => {
  test.concurrent(
    'exposes every type kind with fields, arguments, values, members, defaults and deprecations',
    async ({ expect }) => {
      const { target, token } = await singleProject({ withUsage: false });
      const result = await explorer(target, token);
      const explorerResult = result.latestValidVersion?.explorer;
      invariant(explorerResult, 'Expected an explorer');

      expect(explorerResult.subgraphNames).toEqual([]);
      expect(useFragment(NamedTypeFragment, explorerResult.query)?.name).toBe('Query');
      expect(useFragment(NamedTypeFragment, explorerResult.mutation)?.name).toBe('Mutation');
      expect(useFragment(NamedTypeFragment, explorerResult.subscription)?.name).toBe(
        'Subscription',
      );
      expect(explorerResult.missing).toBeNull();

      const types = outline(explorerResult.types);
      const typeNames = Object.keys(types);
      expect(typeNames).toEqual([...typeNames].sort((a, b) => a.localeCompare(b)));
      expect(types).toMatchObject({
        Query: [
          'user(id, includeDeleted)',
          'users(first, after, filter, order)',
          'search(term)',
          'node(id)',
          'legacyField',
          'withDeprecatedArgument(old, current)',
          'now',
        ],
        Node: ['id'],
        Named: ['id', 'name'],
        User: ['id', 'name', 'role', 'oldName', 'posts(first)'],
        SearchResult: ['User', 'Post'],
        Role: ['ADMIN', 'USER', 'GUEST'],
        UserFilter: ['name', 'role', 'roles', 'nested', 'legacy'],
        CreateUserInput: ['name', 'role'],
        DateTime: [],
      });

      const user = useFragment(NamedTypeFragment, explorerResult.user);
      expect(user?.__typename === 'GraphQLObjectType' && user.interfaces).toEqual([
        'Node',
        'Named',
      ]);
      const role = useFragment(NamedTypeFragment, explorerResult.role);
      expect(
        role?.__typename === 'GraphQLEnumType' &&
          role.values.map(value => [value.name, value.isDeprecated, value.deprecationReason]),
      ).toEqual([
        ['ADMIN', false, null],
        ['USER', false, null],
        ['GUEST', true, 'Guests are no longer supported.'],
      ]);

      expect(result).toMatchSnapshot();
    },
  );

  test.concurrent(
    'reports the usage of types, fields, arguments and enum values',
    async ({ expect }) => {
      const { target, token } = await singleProject({ withUsage: true });
      const result = await explorer(target, token);
      const explorerResult = result.latestValidVersion?.explorer;
      invariant(explorerResult, 'Expected an explorer');

      const query = useFragment(NamedTypeFragment, explorerResult.query);
      invariant(query?.__typename === 'GraphQLObjectType', 'Expected Query to be an object type');
      const userField = query.fields.find(field => field.name === 'user');
      expect(userField?.usage).toMatchObject({ isUsed: true, usedByClients: ['web'] });
      expect(userField?.args.map(arg => [arg.name, arg.usage.isUsed])).toEqual([
        ['id', true],
        ['includeDeleted', false],
      ]);
      expect(query.fields.find(field => field.name === 'search')?.usage.isUsed).toBe(false);

      const role = useFragment(NamedTypeFragment, explorerResult.role);
      expect(
        role?.__typename === 'GraphQLEnumType' &&
          role.values.map(value => [value.name, value.usage.isUsed]),
      ).toEqual([
        ['ADMIN', true],
        ['USER', false],
        ['GUEST', false],
      ]);

      expect(result).toMatchSnapshot();
    },
  );

  test.concurrent(
    'shows subgraph ownership, subgraph names and schema metadata of a federated graph',
    async ({ expect }) => {
      const { target, token } = await federatedProject();
      const result = await explorer(target, token);
      const explorerResult = result.latestValidVersion?.explorer;
      invariant(explorerResult, 'Expected an explorer');

      expect(explorerResult.subgraphNames).toEqual(['posts', 'users']);
      expect(explorerResult.metadataAttributes).toEqual(
        expect.arrayContaining([
          { name: 'team', values: expect.arrayContaining(['posts', 'users']) },
          { name: 'priority', values: ['high'] },
        ]),
      );

      const user = useFragment(NamedTypeFragment, explorerResult.user);
      invariant(user?.__typename === 'GraphQLObjectType', 'Expected User to be an object type');
      expect([...(user.supergraphMetadata?.ownedByServiceNames ?? [])].sort()).toEqual([
        'posts',
        'users',
      ]);
      const owners = Object.fromEntries(
        user.fields.map(field => [field.name, field.supergraphMetadata?.ownedByServiceNames]),
      );
      expect(owners).toMatchObject({
        fullName: ['users'],
        posts: ['posts'],
      });

      const query = useFragment(NamedTypeFragment, explorerResult.query);
      invariant(query?.__typename === 'GraphQLObjectType', 'Expected Query to be an object type');
      const queryUser = query.fields.find(field => field.name === 'user');
      expect(queryUser?.supergraphMetadata?.ownedByServiceNames).toEqual(['users']);
      expect(queryUser?.supergraphMetadata?.metadata).toEqual(
        expect.arrayContaining([
          { name: 'priority', content: 'high', source: 'users' },
          { name: 'team', content: 'users', source: 'users' },
        ]),
      );

      expect(result).toMatchSnapshot();
    },
  );

  test.concurrent('a schema version of a single project has no subgraphs', async ({ expect }) => {
    const { target, token } = await singleProject({ withUsage: false });
    const explorerResult = (await explorer(target, token)).latestValidVersion?.explorer;

    expect(explorerResult?.subgraphNames).toEqual([]);
    expect(explorerResult?.metadataAttributes).toBeNull();
    const user = useFragment(NamedTypeFragment, explorerResult?.user);
    expect(user?.supergraphMetadata).toEqual({ ownedByServiceNames: null, metadata: null });
  });
});

describe('unused schema', () => {
  test.concurrent(
    'without usage, everything defined in the schema is unused',
    async ({ expect }) => {
      const { target, token } = await singleProject({ withUsage: false });
      const result = await unusedSchema(target, token);
      const types = outline(result.latestValidVersion?.unusedSchema?.types ?? []);

      // Every type defined in the SDL, with all of its fields, values and members.
      expect(types).toMatchObject({
        Query: [
          'user(id, includeDeleted)',
          'users(first, after, filter, order)',
          'search(term)',
          'node(id)',
          'legacyField',
          'withDeprecatedArgument(old, current)',
          'now',
        ],
        Mutation: ['createUser(input)'],
        Subscription: ['userCreated'],
        User: ['id', 'name', 'role', 'oldName', 'posts(first)'],
        Role: ['ADMIN', 'USER', 'GUEST'],
        SearchResult: ['User', 'Post'],
        UserFilter: ['name', 'role', 'roles', 'nested', 'legacy'],
        DateTime: [],
      });
      // Built-in scalars are not part of the SDL.
      expect(Object.keys(types)).not.toContain('String');

      expect(result).toMatchSnapshot();
    },
  );

  test.concurrent('used schema coordinates are left out', async ({ expect }) => {
    const { target, token } = await singleProject({ withUsage: true });
    const result = await unusedSchema(target, token);
    const types = outline(result.latestValidVersion?.unusedSchema?.types ?? []);

    // A used field stays while one of its arguments is unused, with only the unused arguments.
    expect(types.Query).toEqual([
      'user(includeDeleted)',
      'users(first, after, order)',
      'search(term)',
      'node(id)',
      'legacyField',
      'withDeprecatedArgument(old, current)',
      'now',
    ]);
    // Used fields are removed.
    expect(types.User).toEqual(['oldName', 'posts(first)']);
    // Used input fields are removed.
    expect(types.UserFilter).toEqual(['name', 'roles', 'nested', 'legacy']);
    // An enum is kept or removed as a whole.
    expect(types).not.toHaveProperty('Role');
    expect(types.Order).toEqual(['ASC', 'DESC']);

    expect(result).toMatchSnapshot();
  });
});

describe('deprecated schema', () => {
  test.concurrent(
    'contains the deprecated fields, arguments, input fields and enum values',
    async ({ expect }) => {
      const { target, token } = await singleProject({ withUsage: true });
      const result = await deprecatedSchema(target, token);
      const types = outline(result.latestValidVersion?.deprecatedSchema?.types ?? []);

      expect(types).toEqual({
        // A field with a deprecated argument is kept with only its deprecated arguments.
        Query: ['legacyField', 'withDeprecatedArgument(old)'],
        // An enum with a deprecated value is kept with all values.
        Role: ['ADMIN', 'USER', 'GUEST'],
        User: ['oldName'],
        UserFilter: ['legacy'],
      });

      expect(result).toMatchSnapshot();
    },
  );

  test.concurrent('shows subgraph ownership in a federated graph', async ({ expect }) => {
    const { target, token } = await federatedProject();
    const result = await deprecatedSchema(target, token);
    const types = result.latestValidVersion?.deprecatedSchema?.types ?? [];

    expect(outline(types)).toEqual({ User: ['name'] });
    const user = useFragment(NamedTypeFragment, types[0]);
    expect(
      user.__typename === 'GraphQLObjectType' && user.fields[0].supergraphMetadata,
    ).toMatchObject({ ownedByServiceNames: ['users'] });

    expect(result).toMatchSnapshot();
  });
});

describe('schema coordinate stats', () => {
  test.concurrent('resolve subgraph ownership and metadata of coordinates', async ({ expect }) => {
    const { target, token } = await federatedProject();
    const result = await execute({
      document: CoordinateOwnersQuery,
      variables: { targetRef: { byId: target.id }, period: period() },
      authToken: token.secret,
    }).then(r => r.expectNoGraphQLErrors());

    expect([...(result.target?.user.supergraphMetadata?.ownedByServiceNames ?? [])].sort()).toEqual(
      ['posts', 'users'],
    );
    expect(result.target?.userPosts.supergraphMetadata?.ownedByServiceNames).toEqual(['posts']);
    expect(result.target?.queryUser.supergraphMetadata?.ownedByServiceNames).toEqual(['users']);
    expect(result.target?.unknown.supergraphMetadata?.ownedByServiceNames).toBeFalsy();

    expect(result).toMatchSnapshot();
  });
});
