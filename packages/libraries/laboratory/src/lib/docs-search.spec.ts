import { buildSchema } from 'graphql';
import { searchSchemaDocs } from './docs-search';

const schema = buildSchema(`
  input UserFilter { nameContains: String }
  enum UserRole { ADMIN VIEWER }
  type User { id: ID!, displayName: String, role: UserRole }
  type Query { users(filter: UserFilter): [User!]! }
`);

describe('searchSchemaDocs', () => {
  it('returns nothing for an empty search', () => {
    expect(searchSchemaDocs(schema, '  ')).toEqual({
      types: [],
      fields: [],
      enumValues: [],
      hasMore: false,
    });
  });

  it('returns nothing without a schema', () => {
    expect(searchSchemaDocs(null, 'user').types).toEqual([]);
  });

  it('matches type names case-insensitively', () => {
    const result = searchSchemaDocs(schema, 'user');

    expect(result.types.map(type => type.name)).toEqual(
      expect.arrayContaining(['User', 'UserFilter', 'UserRole']),
    );
  });

  it('matches fields', () => {
    const result = searchSchemaDocs(schema, 'displayname');

    expect(result.fields).toEqual([{ typeName: 'User', fieldName: 'displayName' }]);
  });

  // The Builder's path search walks out from the root operation types, so it never
  // reaches an input object only referenced as an argument.
  it('finds input object types and their fields', () => {
    const result = searchSchemaDocs(schema, 'namecontains');

    expect(result.fields).toEqual([{ typeName: 'UserFilter', fieldName: 'nameContains' }]);
  });

  it('finds enum values', () => {
    const result = searchSchemaDocs(schema, 'admin');

    expect(result.enumValues).toEqual([{ typeName: 'UserRole', valueName: 'ADMIN' }]);
  });

  it('excludes introspection types', () => {
    const result = searchSchemaDocs(schema, 'type');

    expect(result.types.every(type => !type.name.startsWith('__'))).toBe(true);
    expect(result.fields.every(field => !field.typeName.startsWith('__'))).toBe(true);
  });

  it('caps results and reports that it truncated', () => {
    const result = searchSchemaDocs(schema, 'e', { maxResults: 2 });

    expect(result.hasMore).toBe(true);
    expect(result.types.length + result.fields.length + result.enumValues.length).toBe(2);
  });
});
