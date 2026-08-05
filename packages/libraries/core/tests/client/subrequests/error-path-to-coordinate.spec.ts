import { buildSchema, parse as gql } from 'graphql';
import { errorPathToCoordinate } from '../../../src/client/subrequests/error-path-to-coordinate.js';

const schema = buildSchema(`
  type Query {
    users: [User!]!
    ids: [ID!]
    accounts: [Account]
  }

  type User {
    id: ID!
    email: String!
    status: UserStatus!
  }

  enum UserStatus {
    HEALTHY
  }

  union Account = User | Admin

  type Admin {
    id: ID!
    permissions: [String]!
  }
`);

describe('path-to-coordinate', () => {
  test('inside arrays', () => {
    const document = gql(`{
      users {
        status
      }
    }`);
    expect(errorPathToCoordinate(schema, ['users', 1, 'status'], document)).toBe('User.status');
  });

  test('array', () => {
    const document = gql(`{
      ids
    }`);
    expect(errorPathToCoordinate(schema, ['ids', 1], document)).toBe('Query.ids');
  });

  test('root', () => {
    const document = gql(`{
      users {
        id
      }
    }`);
    expect(errorPathToCoordinate(schema, ['users'], document)).toBe('Query.users');
  });

  test('alias', () => {
    const document = gql(`{
      users {
        uuid: id
      }
    }`);
    expect(errorPathToCoordinate(schema, ['users', 0, 'uuid'], document)).toBe('User.id');
  });

  test('alias + fragment spreads', () => {
    const document = gql(`
    fragment UserFragment on User {
      uuid: id
    }

    {
      users {
        ...UserFragment
      }
    }`);
    expect(errorPathToCoordinate(schema, ['users', 0, 'uuid'], document)).toBe('User.id');
  });

  test('inline fragment', () => {
    const document = gql(`{
      users {
        ...on User {
          id
        }
      }
    }`);
    expect(errorPathToCoordinate(schema, ['users', 0, 'id'], document)).toBe('User.id');
  });

  test('inline fragment + alias', () => {
    const document = gql(`{
      users {
        ...on User {
          uuid: id
        }
      }
    }`);
    expect(errorPathToCoordinate(schema, ['users', 0, 'uuid'], document)).toBe('User.id');
  });

  test('union + inline fragments', () => {
    const unionSchema = buildSchema(`
      union SearchResult = User | Book

      type User {
        id: ID!
        name: String!
      }

      type Book {
        id: ID!
        title: String!
      }

      type Query {
        search: [SearchResult!]!
      }
    `);

    const document = gql(`{
      search {
        ... on User {
          name
        }
        ... on Book {
          bookTitle: title
        }
      }
    }`);

    expect(errorPathToCoordinate(unionSchema, ['search', 0, 'name'], document)).toBe('User.name');
    expect(errorPathToCoordinate(unionSchema, ['search', 1, 'bookTitle'], document)).toBe(
      'Book.title',
    );
  });

  test('union + fragment spreads', () => {
    const unionSchema = buildSchema(`
      union SearchResult = User | Book

      type User {
        id: ID!
        name: String!
      }

      type Book {
        id: ID!
        title: String!
      }

      type Query {
        search: [SearchResult!]!
      }
    `);

    const document = gql(`
      query {
        search {
          ...UserFields
        }
      }
      fragment UserFields on User {
        name
      }
    `);

    expect(errorPathToCoordinate(unionSchema, ['search', 0, 'name'], document)).toBe('User.name');
  });

  test('union + fragment spreads with union types having the same field name', () => {
    const unionSchema = buildSchema(`
      union SearchResult = User | Book

      type User {
        id: ID!
        name: String!
      }

      type Book {
        id: ID!
        title: String!
      }

      type Query {
        search: [SearchResult!]!
      }
    `);

    const document = gql(`
      query {
        search {
          ...UserFields
          ...BookFields
        }
      }
      fragment UserFields on User {
        id
      }

      fragment BookFields on Book {
        id
      }
    `);

    expect(
      errorPathToCoordinate(unionSchema, ['search', 0, 'id'], document, {
        search: [{ __typename: 'Book', id: '1234' }],
      }),
    ).toBe('Book.id');

    expect(
      errorPathToCoordinate(unionSchema, ['search', 0, 'id'], document, {
        search: [{ __typename: 'User', id: '1234' }],
      }),
    ).toBe('User.id');
  });
});
