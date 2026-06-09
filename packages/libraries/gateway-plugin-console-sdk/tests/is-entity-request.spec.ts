import { parse } from 'graphql';
import { isEntityRequest } from '../src/is-entity-request.js';

describe('is entity request returns', () => {
  test('false for normal query', () => {
    const operation = parse(/** graphql */ `
      query Users {
        users { id }
      }
    `);
    expect(isEntityRequest(operation)).toBe(false);
  });

  test('true for an entity query', () => {
    const operation = parse(/** graphql */ `
      query NameDoesntMatter {
        _entities(representations: [{ __typename: "User", id: "1" }]) { ...on User { id, email } }
      }
    `);
    expect(isEntityRequest(operation)).toBe(true);
  });
});
