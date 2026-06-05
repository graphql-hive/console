import { buildSchema, parse, print } from 'graphql';
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function gql(src: string) {
  return parse(src);
}

function typenameCount(doc: ReturnType<typeof addTypenames>): number {
  return (print(doc).match(/__typename/g) ?? []).length;
}

// ---------------------------------------------------------------------------
// Concrete object types with no abstract ancestry in the query
// — __typename should NOT be added
// ---------------------------------------------------------------------------

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
    // User → Address: both concrete with no abstract involvement.
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

// ---------------------------------------------------------------------------
// Interface types — __typename SHOULD be added on the abstract field itself
// ---------------------------------------------------------------------------

describe('interface types', () => {
  it('adds __typename when a field returns an interface', () => {
    const doc = gql(`
      query {
        node(id: "1") {
          id
        }
      }
    `);
    expect(typenameCount(addTypenames(doc, schema))).toBe(1);
  });

  it('adds __typename for a list field returning an interface', () => {
    const doc = gql(`
      query {
        animals {
          name
        }
      }
    `);
    expect(typenameCount(addTypenames(doc, schema))).toBe(1);
  });

  it('adds __typename on a nested interface field inside a concrete type', () => {
    // user → User (concrete, no __typename); friends → [Node] (interface, add __typename)
    const doc = gql(`
      query {
        user(id: "1") {
          friends {
            id
          }
        }
      }
    `);
    expect(typenameCount(addTypenames(doc, schema))).toBe(1);
  });

  it('adds __typename on a self-referencing interface field', () => {
    // animals → Animal (interface); offspring → Animal (interface)
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
    // 2: one per abstract selection set
    expect(typenameCount(addTypenames(doc, schema))).toBe(2);
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
    expect(typenameCount(addTypenames(doc, schema))).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Union types — __typename SHOULD be added on the abstract field itself
// ---------------------------------------------------------------------------

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
    const printed = print(result);
    // search (union) → __typename on the outer set
    expect(printed).toContain('__typename');
  });
});

// ---------------------------------------------------------------------------
// Concrete inline-fragment branches of abstract types
// — __typename SHOULD be added inside the branch
// ---------------------------------------------------------------------------

describe('concrete inline-fragment branches of abstract fields', () => {
  it('adds __typename inside a concrete inline fragment on an interface field', () => {
    // node → Node (interface): outer set + ... on User branch both get __typename
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
    // 2: one on the node (Node interface) set, one inside the ... on User branch
    expect(typenameCount(result)).toBe(2);
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
    // search (union) + ... on User + ... on Post = 3
    expect(typenameCount(result)).toBe(3);
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
    // node set + User branch (not duplicated) = 2
    expect(typenameCount(result)).toBe(2);
  });

  it('adds __typename in a concrete branch and recurses into its abstract sub-fields', () => {
    // pets → [Animal] (interface); ... on Dog (concrete branch) gets __typename;
    // Dog.offspring → [Animal] (interface) also gets __typename.
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
    // pets (Animal interface) + ... on Dog branch + offspring (Animal interface) = 3
    expect(typenameCount(result)).toBe(3);
  });

  it('adds __typename in an untyped inline fragment inside an abstract field', () => {
    // An anonymous `... { }` inherits the parent abstract type.
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
    // node (Node interface) → __typename; anonymous fragment inherits Node → also abstract → __typename
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
    // address is concrete with no abstract parent → no __typename
    // pets is abstract → __typename
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
    // node field (Node) + NodeFields fragment body (also on Node) = 2
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
    // user is concrete, UserFields is on User (concrete) → no __typename anywhere
    expect(typenameCount(addTypenames(doc, schema))).toBe(0);
  });

  it('does not add __typename to the fragment spread node itself', () => {
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
    expect(print(addTypenames(doc, schema))).toContain('...NodeFields');
  });
});

// ---------------------------------------------------------------------------
// Introspection fields
// ---------------------------------------------------------------------------

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
