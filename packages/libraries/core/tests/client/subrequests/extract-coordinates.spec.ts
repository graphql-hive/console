import { buildSchema, parse } from 'graphql';
import { extractCoordinates } from '../../../src/client/subrequests/extract-coordinates.js';

describe('extractCoordinates', () => {
  describe('Types, Fields, and Scalars', () => {
    it('Counts standard object resolution and scalar fields', () => {
      const schema = buildSchema(`
        type Query { user: User }
        type User { id: ID, name: String, age: Int }
      `);
      const document = parse(`
        query { 
          user { id name age } 
        }
      `);
      const resultData = {
        user: { id: '1', name: 'Alice', age: 30 },
      };

      const counts = extractCoordinates({ schema, document, resultData });

      expect(counts).toEqual({
        ID: 1,
        Int: 1,
        Query: 1,
        'Query.user': 1,
        String: 1,
        User: 1,
        'User.id': 1,
        'User.name': 1,
        'User.age': 1,
      });
    });
  });

  describe('Enums', () => {
    it('Resolves the enum value and enum type', () => {
      const schema = buildSchema(`
        type Query { user: User }
        type User { id: ID, status: UserStatus }
        enum UserStatus {
          ACTIVE
          SUSPENDED
        }
      `);
      const document = parse(`
        query { 
          user { 
            id
            status
          } 
        }
      `);
      const resultData = {
        user: { id: '1', status: 'ACTIVE' },
      };

      const counts = extractCoordinates({ schema, document, resultData });

      expect(counts).toEqual({
        ID: 1,
        Query: 1,
        'Query.user': 1,
        User: 1,
        'User.id': 1,
        'User.status': 1,
        UserStatus: 1,
        'UserStatus.ACTIVE': 1,
      });
    });
  });

  describe('Aliases', () => {
    it('Resolves the response key back to the true schema coordinate', () => {
      const schema = buildSchema(`
        type Query { user: User }
        type User { id: ID, name: String }
      `);
      const document = parse(`
        query { 
          firstUser: user { 
            userId: id 
            userName: name 
          } 
        }
      `);
      const resultData = {
        firstUser: { userId: '1', userName: 'Alice' },
      };

      const counts = extractCoordinates({ schema, document, resultData });

      expect(counts).toEqual({
        ID: 1,
        Query: 1,
        'Query.user': 1,
        String: 1,
        User: 1,
        'User.id': 1,
        'User.name': 1,
      });
    });
  });

  describe('Interfaces', () => {
    it('Extracts the returned type usage for an interface', () => {
      const schema = buildSchema(`
        interface Node { id: ID! }
        type User implements Node { id: ID!, name: String }
        type Query { node: Node }
      `);
      const document = parse(`
        query { 
          node { 
            id 
            ... on User { name } 
          } 
        }
      `);
      const resultData = {
        node: { __typename: 'User', id: '1', name: 'Alice' },
      };

      const counts = extractCoordinates({ schema, document, resultData });

      expect(counts).toEqual({
        ID: 1,
        Query: 1,
        Node: 1,
        'Query.node': 1,
        String: 1,
        User: 1,
        'Node.id': 1,
        'User.id': 1,
        'User.name': 1,
      });
    });

    it('Extracts the interface usage for an implementing type', () => {
      const schema = buildSchema(`
        interface Node { id: ID! }
        type User implements Node { id: ID!, name: String }
        type Query { user: User }
      `);
      const document = parse(`
        query { 
          user { 
            id 
            name
          } 
        }
      `);
      const resultData = {
        user: { __typename: 'User', id: '1', name: 'Alice' },
      };

      const counts = extractCoordinates({ schema, document, resultData });

      expect(counts).toEqual({
        ID: 1,
        Query: 1,
        Node: 1,
        'Query.user': 1,
        String: 1,
        User: 1,
        'Node.id': 1,
        'User.id': 1,
        'User.name': 1,
      });
    });
  });

  describe('Unions', () => {
    it('Extracts from a union type', () => {
      const schema = buildSchema(`
        union SearchResult = User | Post
        type User { name: String }
        type Post { title: String }
        type Query { search: SearchResult }
      `);
      const document = parse(`
        query { 
          search { 
            ... on User { name } 
            ... on Post { __typename, title } 
          } 
        }
      `);
      const resultData = {
        search: { __typename: 'Post', title: 'GraphQL Guide' },
      };

      const counts = extractCoordinates({ schema, document, resultData });

      expect(counts).toEqual({
        Query: 1,
        'Query.search': 1,
        String: 1,
        Post: 1,
        'Post.title': 1,
        SearchResult: 1,
      });
    });

    it('Extracts types from a list of union types without __typename in the response', () => {
      const schema = buildSchema(`
        union SearchResult = User | Post
        type User { name: String }
        type Post { title: String }
        type Query { search: [SearchResult] }
      `);
      const document = parse(`
        query { 
          search { 
            ... on User { name } 
            ... on Post { __typename, title } 
          } 
        }
      `);
      const resultData = {
        search: [{ name: 'Alice' }, { __typename: 'Post', title: 'GraphQL Guide' }],
      };

      const counts = extractCoordinates({ schema, document, resultData });

      expect(counts).toEqual({
        Query: 1,
        'Query.search': 1,
        String: 1,
        Post: 1,
        'Post.title': 1,
        SearchResult: 2, // the abstract type returned by Query.search
        /**
         * Note that ideally this would match:
         *   String: 2,
         *   User: 1,
         *   'User.name': 1,
         * but because the user doesn't return the typename, we can't be sure of anything.
         * This is a hard limit of this approach. It's overcome by including the __typename
         * on every abstract type in an operation, which needs implemented by the plugin.
         */
      });
    });

    it('Extracts types from a list of union types', () => {
      const schema = buildSchema(`
        union SearchResult = User | Post
        type User { name: String }
        type Post { title: String }
        type Query { search: [SearchResult] }
      `);
      const document = parse(`
        query { 
          search { 
            ... on User { name } 
            ... on Post { __typename, title } 
          } 
        }
      `);
      const resultData = {
        search: [
          { __typename: 'User', name: 'Alice' },
          { __typename: 'Post', title: 'GraphQL Guide' },
        ],
      };

      const counts = extractCoordinates({ schema, document, resultData });

      expect(counts).toEqual({
        Query: 1,
        'Query.search': 1,
        String: 2,
        Post: 1,
        User: 1,
        'User.name': 1,
        'Post.title': 1,
        SearchResult: 2,
      });
    });
  });

  describe('Fragment Spreads', () => {
    it('Extracts from named fragment definitions', () => {
      const schema = buildSchema(`
        type Query { user: User }
        type User { id: ID, email: String }
      `);
      const document = parse(`
        query { 
          user { ...UserFields } 
        }
        fragment UserFields on User { 
          id 
          email 
        }
      `);
      const resultData = {
        user: { id: '1', email: 'test@example.com' },
      };

      const counts = extractCoordinates({ schema, document, resultData });

      expect(counts).toEqual({
        ID: 1,
        Query: 1,
        'Query.user': 1,
        String: 1,
        User: 1,
        'User.id': 1,
        'User.email': 1,
      });
    });

    it('Extracts from inline fragments', () => {
      const schema = buildSchema(`
        type Query { user: User }
        type User { id: ID, email: String }
      `);
      const document = parse(`
        query { 
          user {
            ...on User {
              id 
              email
            }
          } 
        }
      `);
      const resultData = {
        user: { id: '1', email: 'test@example.com' },
      };

      const counts = extractCoordinates({ schema, document, resultData });

      expect(counts).toEqual({
        ID: 1,
        Query: 1,
        'Query.user': 1,
        String: 1,
        User: 1,
        'User.id': 1,
        'User.email': 1,
      });
    });

    it('Handles deeply nested fragments', () => {
      const schema = buildSchema(`
        type Product implements ProductItf & SkuItf {
          upc: String!
          name: String
          reviews: [Review]
        }

        type User {
          id: ID!
          name: String
          reviews: [Review]
        }

        type Review {
          id: ID!
          body: String
          author: User
          product: Product
        }

        type Query {
          topProducts(first: Int = 5): [ProductItf!]!
          users(limit: Int! = 30): [User]
        }

        interface ProductItf implements SkuItf {
          upc: String!
          name: String
        }

        interface SkuItf {
          sku: String
        }
      `);
      const document = parse(`
        fragment User on User {
          id
          username
          name
        }

        fragment Review on Review {
          id
          body
        }

        fragment Product on Product {
          inStock
          name
          price
          shippingEstimate
          upc
          weight
        }

        query TestQuery {
          users {
            ...User
            reviews {
              ...Review
              product {
                ...Product
                reviews {
                  ...Review
                  author {
                    ...User
                    reviews {
                      ...Review
                      product {
                        ...Product
                      }
                    }
                  }
                }
              }
            }
          }
          topProducts {
            ...Product
            reviews {
              ...Review
              author {
                ...User
                reviews {
                  ...Review
                  product {
                    ...Product
                  }
                }
              }
            }
          }
        }
      `);

      const resultData = {
        users: [
          {
            id: 'user-1',
            name: 'Alice Smith',
            reviews: [
              {
                id: 'review-101',
                body: 'Absolutely love this laptop! Highly recommend.',
                product: {
                  upc: '9876543210',
                  name: 'QuantumBook Pro 15',
                  reviews: [
                    {
                      id: 'review-101',
                      body: 'Absolutely love this laptop! Highly recommend.',
                      author: {
                        id: 'user-1',
                        name: 'Alice Smith',
                        reviews: [
                          {
                            id: 'review-101',
                            body: 'Absolutely love this laptop! Highly recommend.',
                            product: {
                              upc: '9876543210',
                              name: 'QuantumBook Pro 15',
                            },
                          },
                        ],
                      },
                    },
                  ],
                },
              },
            ],
          },
        ],
        topProducts: [
          {
            upc: '1234567890',
            name: 'ErgoDesk Premium',
            reviews: [
              {
                id: 'review-202',
                body: 'Great desk, but assembly took forever.',
                author: {
                  id: 'user-2',
                  name: 'Bob Jones',
                  reviews: [
                    {
                      id: 'review-202',
                      body: 'Great desk, but assembly took forever.',
                      product: {
                        upc: '1234567890',
                        name: 'ErgoDesk Premium',
                      },
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      const counts = extractCoordinates({ schema, document, resultData });

      expect(counts).toMatchInlineSnapshot(`
        {
          ID: 5,
          Product: 2,
          Product.name: 2,
          Product.reviews: 1,
          Product.upc: 2,
          ProductItf: 3,
          ProductItf.name: 2,
          ProductItf.upc: 2,
          Query: 1,
          Query.topProducts: 1,
          Query.users: 1,
          Review: 3,
          Review.author: 1,
          Review.body: 3,
          Review.id: 3,
          Review.product: 2,
          SkuItf: 2,
          String: 9,
          User: 2,
          User.id: 2,
          User.name: 2,
          User.reviews: 2,
        }
      `);
    });
  });

  describe('Null Handling', () => {
    it('Includes null values in fields but not the returnType of that field', () => {
      const schema = buildSchema(`
        type Query { user: User }
        type User { id: ID, name: String }
      `);
      const document = parse(`
        query { user { id name } }
      `);
      const resultData = {
        user: null,
      };

      const counts = extractCoordinates({ schema, document, resultData });

      expect(counts).toEqual({
        Query: 1,
        'Query.user': 1,
      });
    });
  });

  describe('Arrays', () => {
    it('Does not assume every element in the array has the same values', () => {
      const schema = buildSchema(`
        type Query { users: [User] }
        type User { id: ID, name: String, friends: [User] }
      `);
      const document = parse(`
        query { users { id name friends { id } } }
      `);
      const resultData = {
        users: [
          {
            id: 1,
            name: null,
            friends: [{ id: 2 }],
          },
          {
            id: 2,
            name: 'OK',
            friends: null,
          },
        ],
      };

      const counts = extractCoordinates({ schema, document, resultData });

      expect(counts).toEqual({
        Query: 1,
        'Query.users': 1,
        User: 3,
        'User.id': 3,
        ID: 3,
        'User.name': 2,
        String: 1,
        'User.friends': 2,
      });
    });
  });
});
