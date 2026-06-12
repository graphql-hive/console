import { buildSchema, parse as gql, print } from 'graphql';
import { addTypenames } from '../src/add-typenames.js';

// ---------------------------------------------------------------------------
// Shared test schema
// ---------------------------------------------------------------------------
//
// Covers every case we test:
//   - Concrete object types  (User, Post, Address)
//   - Interface               (Node, Animal)
//   - Union                   (SearchResult)
//   - Scalars                 (ID, String)
//   - Nested abstract fields  (Animal.offspring: Animal)
//   - Mixed concrete/abstract (User.pets: [Animal], User.friends: [Node])

const schema = buildSchema(`
  interface Node {
    id: ID!
  }

  interface Animal {
    name: String!
    offspring: [Animal!]!
  }

  type Cat implements Animal & Node {
    id: ID!
    name: String!
    offspring: [Animal!]!
    indoor: Boolean!
  }

  type Dog implements Animal & Node {
    id: ID!
    name: String!
    offspring: [Animal!]!
    breed: String!
  }

  union SearchResult = User | Post

  type Address {
    city: String!
    country: String!
  }

  type User implements Node {
    id: ID!
    name: String!
    address: Address!
    pets: [Animal!]!
    friends: [Node!]!
  }

  type Post implements Node {
    id: ID!
    title: String!
    author: User!
  }

  type Query {
    user(id: ID!): User
    node(id: ID!): Node
    search(term: String!): [SearchResult!]!
    animals: [Animal!]!
    health: String!
  }

  type Mutation {
    createUser(name: String!): User!
  }

  type Subscription {
    userUpdated: User!
  }
`);

function typenameCount(doc: ReturnType<typeof addTypenames>): number {
  return (print(doc).match(/__typename/g) ?? []).length;
}

describe('concrete object types (not inside an abstract field)', () => {
  it('does not add __typename when the root field returns a concrete type', () => {
    const doc = gql(`
      query {
        user(id: "1") {
          id
          name
        }
      }
    `);
    expect(typenameCount(addTypenames(doc, schema))).toBe(0);
  });

  it('does not add __typename for nested concrete object fields', () => {
    const doc = gql(`
      query {
        user(id: "1") {
          address {
            city
            country
          }
        }
      }
    `);
    expect(typenameCount(addTypenames(doc, schema))).toBe(0);
  });
});

describe('interface types', () => {
  it('adds __typename when a field returns an interface', () => {
    const doc = gql(`
      query {
        node(id: "1") {
          id
        }
      }
    `);
    const result = addTypenames(doc, schema);
    expect(print(result)).toMatchInlineSnapshot(`
      {
        node(id: "1") {
          id
          __typename
        }
      }
    `);
    expect(typenameCount(result)).toBe(1);
  });

  it('adds __typename for a list field returning an interface', () => {
    const doc = gql(`
      query {
        animals {
          name
        }
      }
    `);
    const result = addTypenames(doc, schema);
    expect(print(result)).toMatchInlineSnapshot(`
      {
        animals {
          name
          __typename
        }
      }
    `);
    expect(typenameCount(result)).toBe(1);
  });

  it('adds __typename on a nested interface field inside a concrete type', () => {
    const doc = gql(`
      query {
        user(id: "1") {
          friends {
            id
          }
        }
      }
    `);
    const result = addTypenames(doc, schema);
    expect(print(result)).toMatchInlineSnapshot(`
      {
        user(id: "1") {
          friends {
            id
            __typename
          }
        }
      }
    `);
    expect(typenameCount(result)).toBe(1);
  });

  it('adds __typename on a self-referencing interface field', () => {
    const doc = gql(`
      query {
        animals {
          name
          offspring {
            name
          }
        }
      }
    `);
    const result = addTypenames(doc, schema);
    expect(print(result)).toMatchInlineSnapshot(`
      {
        animals {
          name
          offspring {
            name
            __typename
          }
          __typename
        }
      }
    `);
    expect(typenameCount(result)).toBe(2);
  });

  it('does not duplicate __typename when already present on an interface field', () => {
    const doc = gql(`
      query {
        node(id: "1") {
          __typename
          id
        }
      }
    `);
    const result = addTypenames(doc, schema);
    expect(print(result)).toMatchInlineSnapshot(`
      {
        node(id: "1") {
          __typename
          id
        }
      }
    `);
    expect(typenameCount(result)).toBe(1);
  });
});

describe('union types', () => {
  it('adds __typename on the union field selection set', () => {
    const doc = gql(`
      query {
        search(term: "foo") {
          ... on User {
            name
          }
          ... on Post {
            title
          }
        }
      }
    `);
    const result = addTypenames(doc, schema);
    expect(print(result)).toMatchInlineSnapshot(`
      {
        search(term: "foo") {
          ... on User {
            name
          }
          ... on Post {
            title
          }
          __typename
        }
      }
    `);
    expect(typenameCount(result)).toBe(1);
  });
});

describe('concrete inline-fragment branches of abstract fields', () => {
  it('adds __typename on the abstract type implementing an inline fragment', () => {
    const doc = gql(`
      query {
        node(id: "1") {
          ... on User {
            name
          }
        }
      }
    `);
    const result = addTypenames(doc, schema);
    expect(print(result)).toMatchInlineSnapshot(`
      {
        node(id: "1") {
          ... on User {
            name
          }
          __typename
        }
      }
    `);
    expect(typenameCount(result)).toBe(1);
  });

  it('adds __typename inside each concrete branch of a union', () => {
    const doc = gql(`
      query {
        search(term: "foo") {
          ... on User {
            name
          }
          ... on Post {
            title
          }
        }
      }
    `);
    const result = addTypenames(doc, schema);
    expect(print(result)).toMatchInlineSnapshot(`
      {
        search(term: "foo") {
          ... on User {
            name
          }
          ... on Post {
            title
          }
          __typename
        }
      }
    `);
    expect(typenameCount(result)).toBe(1);
  });

  it('does not duplicate __typename in a concrete branch that already has it', () => {
    const doc = gql(`
      query {
        node(id: "1") {
          ... on User {
            __typename
            name
          }
        }
      }
    `);
    const result = addTypenames(doc, schema);
    expect(print(result)).toMatchInlineSnapshot(`
      {
        node(id: "1") {
          ... on User {
            __typename
            name
          }
          __typename
        }
      }
    `);
    expect(typenameCount(result)).toBe(2);
  });

  it('adds __typename in a concrete branch and recurses into its abstract sub-fields', () => {
    const doc = gql(`
      query {
        user(id: "1") {
          pets {
            ... on Dog {
              breed
              offspring {
                name
              }
            }
          }
        }
      }
    `);
    const result = addTypenames(doc, schema);
    expect(print(result)).toMatchInlineSnapshot(`
      {
        user(id: "1") {
          pets {
            ... on Dog {
              breed
              offspring {
                name
                __typename
              }
            }
            __typename
          }
        }
      }
    `);
    expect(typenameCount(result)).toBe(2);
  });

  it('adds __typename in an untyped inline fragment inside an abstract field', () => {
    const doc = gql(`
      query {
        node(id: "1") {
          ... {
            id
          }
        }
      }
    `);
    const result = addTypenames(doc, schema);
    expect(print(result)).toMatchInlineSnapshot(`
      {
        node(id: "1") {
          ... {
            id
            __typename
          }
          __typename
        }
      }
    `);
    expect(typenameCount(result)).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Mixed concrete + abstract fields on the same type
// ---------------------------------------------------------------------------

describe('mixed fields', () => {
  it('adds __typename only for abstract fields, not for concrete sibling fields', () => {
    // user.address → Address (concrete); user.pets → [Animal] (interface)
    const doc = gql(`
      query {
        user(id: "1") {
          address {
            city
          }
          pets {
            name
          }
        }
      }
    `);
    const result = addTypenames(doc, schema);
    expect(print(result)).toMatchInlineSnapshot(`
      {
        user(id: "1") {
          address {
            city
          }
          pets {
            name
            __typename
          }
        }
      }
    `);
    expect(typenameCount(result)).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Named fragments
// ---------------------------------------------------------------------------

describe('named fragments', () => {
  it('adds __typename in a fragment defined on an interface type', () => {
    const doc = gql(`
      query {
        node(id: "1") {
          ...NodeFields
        }
      }

      fragment NodeFields on Node {
        id
      }
    `);
    const result = addTypenames(doc, schema);
    expect(print(result)).toMatchInlineSnapshot(`
      {
        node(id: "1") {
          ...NodeFields
          __typename
        }
      }

      fragment NodeFields on Node {
        id
        __typename
      }
    `);
    expect(typenameCount(result)).toBe(2);
  });

  it('does not add __typename in a fragment defined on a concrete type not in an abstract context', () => {
    const doc = gql(`
      query {
        user(id: "1") {
          ...UserFields
        }
      }

      fragment UserFields on User {
        id
        name
      }
    `);
    expect(typenameCount(addTypenames(doc, schema))).toBe(0);
  });

  /**
   * @NOTE This may be unnecessary, but it's not harmful. The typename is requested on an abstract
   * field always, regardless of the selection set inside. This simplifies the logic.
   * The __typename on the fragment could be avoided, but it helps ensure that if
   * federation splits the request due to entity types, that that fragment still
   * will receive the typename.
   */
  it('adds __typename to the fragment spread node and the parent field', () => {
    const doc = gql(`
      query {
        node(id: "1") {
          ...NodeFields
        }
      }

      fragment NodeFields on Node {
        id
      }
    `);
    const result = addTypenames(doc, schema);
    expect(print(result)).toMatchInlineSnapshot(`
      {
        node(id: "1") {
          ...NodeFields
          __typename
        }
      }

      fragment NodeFields on Node {
        id
        __typename
      }
    `);
    expect(typenameCount(result)).toBe(2);
  });
});

describe('introspection fields', () => {
  it('does not add __typename inside __schema', () => {
    const doc = gql(`
      query {
        __schema {
          queryType {
            name
          }
        }
      }
    `);
    expect(typenameCount(addTypenames(doc, schema))).toBe(0);
  });

  it('does not add __typename inside __type', () => {
    const doc = gql(`
      query {
        __type(name: "User") {
          fields {
            name
          }
        }
      }
    `);
    expect(typenameCount(addTypenames(doc, schema))).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Operation types
// ---------------------------------------------------------------------------

describe('operation types', () => {
  it('does not add __typename for a mutation returning a concrete type', () => {
    const doc = gql(`
      mutation {
        createUser(name: "Alice") {
          id
          name
        }
      }
    `);
    expect(typenameCount(addTypenames(doc, schema))).toBe(0);
  });

  it('does not add __typename for a subscription returning a concrete type', () => {
    const doc = gql(`
      subscription {
        userUpdated {
          id
          name
        }
      }
    `);
    expect(typenameCount(addTypenames(doc, schema))).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Scalar-only queries
// ---------------------------------------------------------------------------

describe('scalar fields', () => {
  it('does not add __typename for a scalar-only root field', () => {
    const doc = gql(`
      query {
        health
      }
    `);
    expect(typenameCount(addTypenames(doc, schema))).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Idempotency
// ---------------------------------------------------------------------------

describe('idempotency', () => {
  it('is stable across multiple applications on an interface field', () => {
    const doc = gql(`
      query {
        node(id: "1") {
          ... on User {
            name
          }
        }
      }
    `);
    const once = addTypenames(doc, schema);
    const twice = addTypenames(once, schema);
    expect(print(once)).toBe(print(twice));
  });
});

// ---------------------------------------------------------------------------
// Immutability
// ---------------------------------------------------------------------------

describe('immutability', () => {
  it('does not mutate the original document', () => {
    const doc = gql(`
      query {
        node(id: "1") {
          ... on User {
            name
          }
        }
      }
    `);
    const before = print(doc);
    addTypenames(doc, schema);
    expect(print(doc)).toBe(before);
  });
});
