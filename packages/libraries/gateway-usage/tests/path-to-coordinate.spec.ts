import { buildSchema } from 'graphql';
import { pathToCoordinate } from '../src/path-to-coordinate.js';

const schema = buildSchema(`
  type Query {
    users: [User!]!
    ids: [ID!]
  }

  type User {
    id: ID!
    email: String!
    status: UserStatus!
  }

  enum UserStatus {
    HEALTHY
  }

`);

describe('can determine determines using a path', () => {
  test('inside arrays', () => {
    expect(pathToCoordinate(schema, ['users', 1, 'status'])).toBe('User.status');
  });

  test('within an array', () => {
    expect(pathToCoordinate(schema, ['ids', 1])).toBe('Query.ids');
  });

  test('at root', () => {
    expect(pathToCoordinate(schema, ['users'])).toBe('Query.users');
  });
});
