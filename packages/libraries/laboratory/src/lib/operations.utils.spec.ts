import { buildSchema } from 'graphql';
import {
  addArgToField,
  addPathToQuery,
  buildForcedOpenPathSet,
  buildVisiblePathSet,
  createSchemaPathSearchIndex,
  deletePathFromQuery,
  extractPaths,
  getOpenPaths,
  getOperationName,
  getOperationType,
  handleTemplate,
  healQuery,
  isArgInQuery,
  isPathInQuery,
  pathsToStrings,
  removeArgFromField,
  schemaToPaths,
  searchSchemaPathIndex,
  searchSchemaPaths,
} from './operations.utils';

describe('handleTemplate', () => {
  it('substitutes a single variable', () => {
    expect(handleTemplate('{{name}}', { name: 'Bob' })).toBe('Bob');
  });

  it('substitutes a variable embedded in surrounding text', () => {
    expect(handleTemplate('Bearer {{token}}', { token: 'abc' })).toBe('Bearer abc');
  });

  it('substitutes multiple variables', () => {
    expect(handleTemplate('{{a}}-{{b}}', { a: '1', b: '2' })).toBe('1-2');
  });

  it('resolves dotted lodash paths', () => {
    expect(handleTemplate('{{auth.token}}', { auth: { token: 'xyz' } })).toBe('xyz');
  });

  it('leaves the literal placeholder when the variable is missing', () => {
    expect(handleTemplate('{{missing}}', {})).toBe('{{missing}}');
  });

  it('leaves text without placeholders untouched', () => {
    expect(handleTemplate('plain text', { name: 'Bob' })).toBe('plain text');
  });

  it('substitutes falsy-but-defined values like 0', () => {
    expect(handleTemplate('{{count}}', { count: 0 })).toBe('0');
  });

  it('falls back to the literal for null values (nullish, not falsy)', () => {
    expect(handleTemplate('{{x}}', { x: null })).toBe('{{x}}');
  });

  it('is whitespace-sensitive: inner spaces are part of the lookup key and do not resolve', () => {
    expect(handleTemplate('{{ name }}', { name: 'Bob' })).toBe('{{ name }}');
  });
});

describe('getOperationName', () => {
  it('reads the name of a named operation', () => {
    expect(getOperationName('query Foo { a }')).toBe('Foo');
  });

  it('reads the name of a named mutation', () => {
    expect(getOperationName('mutation DoIt { x }')).toBe('DoIt');
  });

  it('returns undefined for an anonymous operation', () => {
    expect(getOperationName('{ a }')).toBeUndefined();
  });

  it('falls back to a regex when the query does not parse', () => {
    expect(getOperationName('query Broken { a ')).toBe('Broken');
  });
});

describe('getOperationType', () => {
  it('detects query, mutation and subscription', () => {
    expect(getOperationType('query Q { a }')).toBe('query');
    expect(getOperationType('mutation M { a }')).toBe('mutation');
    expect(getOperationType('subscription S { a }')).toBe('subscription');
  });

  it('defaults an anonymous shorthand to query', () => {
    expect(getOperationType('{ a }')).toBe('query');
  });

  it('returns null for an unparseable query', () => {
    expect(getOperationType('not a query {')).toBeNull();
  });
});

describe('healQuery', () => {
  it('strips empty selection sets', () => {
    expect(healQuery('query Foo {}')).toBe('query Foo ');
    expect(healQuery('query Foo { }')).toBe('query Foo ');
  });

  it('leaves non-empty selection sets intact', () => {
    expect(healQuery('query Foo { a }')).toBe('query Foo { a }');
  });
});

describe('isPathInQuery', () => {
  const query = 'query { user { name } }';

  it('finds a leaf path', () => {
    expect(isPathInQuery(query, 'query.user.name')).toBe(true);
  });

  it('finds an intermediate path', () => {
    expect(isPathInQuery(query, 'query.user')).toBe(true);
  });

  it('returns false for a missing path', () => {
    expect(isPathInQuery(query, 'query.user.email')).toBe(false);
  });

  it('returns true for the bare operation with no segments', () => {
    expect(isPathInQuery(query, 'query')).toBe(true);
  });

  it('returns false for empty inputs', () => {
    expect(isPathInQuery('', 'query.user')).toBe(false);
    expect(isPathInQuery(query, '')).toBe(false);
  });
});

describe('isArgInQuery', () => {
  const query = 'query { user(id: 1) { name } }';

  it('detects an argument present on a field', () => {
    expect(isArgInQuery(query, 'query.user', 'id')).toBe(true);
  });

  it('returns false for an absent argument', () => {
    expect(isArgInQuery(query, 'query.user', 'limit')).toBe(false);
  });
});

describe('extractPaths / getOpenPaths', () => {
  it('lists every field path including the root operation', () => {
    expect(getOpenPaths('query { user { name } }')).toEqual([
      'query',
      'query.user',
      'query.user.name',
    ]);
  });

  it('returns an empty list for an unparseable query', () => {
    expect(extractPaths('not valid {')).toEqual([]);
  });
});

describe('addPathToQuery / deletePathFromQuery', () => {
  it('adds a nested path to an empty query and it round-trips as present', () => {
    const result = addPathToQuery('', 'query.user.name');
    expect(isPathInQuery(result, 'query.user.name')).toBe(true);
  });

  it('adds a sibling field without dropping the existing one', () => {
    const result = addPathToQuery('query { user { id } }', 'query.user.name');
    expect(isPathInQuery(result, 'query.user.id')).toBe(true);
    expect(isPathInQuery(result, 'query.user.name')).toBe(true);
  });

  it('deletes a leaf field while leaving its sibling intact', () => {
    const result = deletePathFromQuery('query { user { id name } }', 'query.user.name');
    expect(isPathInQuery(result, 'query.user.name')).toBe(false);
    expect(isPathInQuery(result, 'query.user.id')).toBe(true);
  });
});

describe('addArgToField / removeArgFromField', () => {
  const schema = buildSchema(/* GraphQL */ `
    type Query {
      a(id: ID!): User
      b(id: ID!): User
    }
    type User {
      id: ID!
      name: String!
    }
  `);

  it('adds an argument (and its variable) to a field', () => {
    const result = addArgToField('query { a { id } }', 'query.a', 'id', schema);
    expect(isArgInQuery(result, 'query.a', 'id')).toBe(true);
  });

  it('generates a unique variable name when the same arg name is reused', () => {
    const withA = addArgToField('query { a { id } b { id } }', 'query.a', 'id', schema);
    const withBoth = addArgToField(withA, 'query.b', 'id', schema);
    expect(isArgInQuery(withBoth, 'query.a', 'id')).toBe(true);
    expect(isArgInQuery(withBoth, 'query.b', 'id')).toBe(true);
    expect(withBoth).toContain('$id2');
  });

  it('removes an argument from a field', () => {
    const withArg = addArgToField('query { a { id } }', 'query.a', 'id', schema);
    const removed = removeArgFromField(withArg, 'query.a', 'id');
    expect(isArgInQuery(removed, 'query.a', 'id')).toBe(false);
  });
});

describe('schemaToPaths', () => {
  const schema = buildSchema(/* GraphQL */ `
    type Query {
      user: User
      posts: [Post!]!
    }
    type User {
      id: ID!
      name: String!
      bestFriend: User
    }
    type Post {
      title: String!
    }
  `);

  it('walks object fields into dotted paths', () => {
    const paths = pathsToStrings(schemaToPaths(schema));
    expect(paths).toContain('query.user.name');
    expect(paths).toContain('query.posts.title');
  });

  it('stops at a recursive type to avoid infinite expansion', () => {
    const paths = pathsToStrings(schemaToPaths(schema));
    expect(paths).toContain('query.user.bestFriend');
    expect(paths).not.toContain('query.user.bestFriend.name');
  });
});

describe('searchSchemaPaths', () => {
  const schema = buildSchema(/* GraphQL */ `
    type Query {
      user: User
    }
    type User {
      id: ID!
      name: String!
    }
  `);

  it('matches a field by name and marks its ancestors visible and forced open', () => {
    const result = searchSchemaPaths(schema, 'name');
    expect(result.matchedPaths).toContain('query.user.name');
    expect(result.visiblePaths.has('query.user')).toBe(true);
    expect(result.forcedOpenPaths.has('query.user')).toBe(true);
  });

  it('returns an empty result for a blank search', () => {
    const result = searchSchemaPaths(schema, '   ');
    expect(result.matchedPaths).toEqual([]);
    expect(result.hasMore).toBe(false);
  });
});

describe('schema path search index', () => {
  const index = createSchemaPathSearchIndex(['query.user.name', 'query.user.id']);

  it('matches a single term against the path without the operation prefix', () => {
    expect(searchSchemaPathIndex(index, 'name')).toEqual(['query.user.name']);
  });

  it('matches a dotted multi-segment search', () => {
    expect(searchSchemaPathIndex(index, 'user.name')).toEqual(['query.user.name']);
  });

  it('buildVisiblePathSet includes the full path plus every ancestor', () => {
    const set = buildVisiblePathSet(['query.user.name']);
    expect(set.has('query')).toBe(true);
    expect(set.has('query.user')).toBe(true);
    expect(set.has('query.user.name')).toBe(true);
  });

  it('buildForcedOpenPathSet includes only ancestors, not the leaf', () => {
    const set = buildForcedOpenPathSet(['query.user.name']);
    expect(set.has('query.user')).toBe(true);
    expect(set.has('query.user.name')).toBe(false);
  });
});
