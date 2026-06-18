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

  describe('Unions & Arrays', () => {
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
});
