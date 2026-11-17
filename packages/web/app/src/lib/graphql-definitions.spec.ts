import { indexSdlDefinitions } from './graphql-definitions';

describe('indexSdlDefinitions', () => {
  it('indexes every kind of type definition by its name token', () => {
    const index = indexSdlDefinitions(
      [
        'type Query { user: User }',
        'interface Node { id: ID! }',
        'union Result = User',
        'enum Role { ADMIN }',
        'input UserFilter { role: Role }',
        'scalar DateTime',
      ].join('\n'),
    );

    expect(index.types.get('Query')).toEqual({
      startLineNumber: 1,
      startColumn: 6,
      endLineNumber: 1,
      endColumn: 11,
    });
    expect([...index.types.keys()]).toEqual([
      'Query',
      'Node',
      'Result',
      'Role',
      'UserFilter',
      'DateTime',
    ]);
    expect(index.types.get('DateTime')?.startLineNumber).toBe(6);
  });

  it('prefers the definition over an extension that comes first', () => {
    const index = indexSdlDefinitions(
      ['extend type User { name: String }', 'type User { id: ID! }'].join('\n'),
    );

    expect(index.types.get('User')?.startLineNumber).toBe(2);
  });

  it('falls back to the extension when the type is defined in another service', () => {
    const index = indexSdlDefinitions('extend type User @key(fields: "id") { id: ID! }');

    expect(index.types.get('User')).toEqual({
      startLineNumber: 1,
      startColumn: 13,
      endLineNumber: 1,
      endColumn: 17,
    });
  });

  it('keeps directives apart from types of the same name', () => {
    const index = indexSdlDefinitions(
      ['directive @key(fields: String!) on OBJECT', 'type key { a: String }'].join('\n'),
    );

    expect(index.directives.get('key')?.startLineNumber).toBe(1);
    expect(index.types.get('key')?.startLineNumber).toBe(2);
  });

  it('has nothing for names it never saw', () => {
    expect(indexSdlDefinitions('type Query { a: String }').types.get('User')).toBeUndefined();
  });

  it('is empty for SDL that does not parse, instead of throwing', () => {
    const index = indexSdlDefinitions('type Query {');

    expect(index.types.size).toBe(0);
    expect(index.directives.size).toBe(0);
  });
});
