import { findSdlDefinition, SDL_VIEWER_SCHEME, type SdlModelLike } from './sdl-definition-lookup';

function model(sdl: string, scheme = SDL_VIEWER_SCHEME): SdlModelLike {
  const lines = sdl.split('\n');
  return {
    uri: { scheme },
    getValue: () => sdl,
    getVersionId: () => 1,
    getLineContent: lineNumber => lines[lineNumber - 1] ?? '',
    getWordAtPosition: ({ lineNumber, column }) => {
      const line = lines[lineNumber - 1] ?? '';
      for (const match of line.matchAll(/[_A-Za-z][_0-9A-Za-z]*/g)) {
        const startColumn = match.index + 1;
        if (column >= startColumn && column <= startColumn + match[0].length) {
          return { word: match[0], startColumn };
        }
      }
      return null;
    },
  };
}

const SDL = [
  'directive @key(fields: String!) on OBJECT',
  'type Query { me: User, team: Team }',
  'type User @key(fields: "id") { id: ID! }',
  'type key { a: String }',
  'extend type Team { id: ID! }',
].join('\n');

describe('findSdlDefinition', () => {
  it('finds the type under the cursor', () => {
    expect(findSdlDefinition(model(SDL), { lineNumber: 2, column: 19 })).toEqual({
      startLineNumber: 3,
      startColumn: 6,
      endLineNumber: 3,
      endColumn: 10,
    });
  });

  it('finds the directive, not a type of the same name, after an @', () => {
    expect(findSdlDefinition(model(SDL), { lineNumber: 3, column: 13 })?.startLineNumber).toBe(1);
  });

  it('falls back to the extension for a type defined in another service', () => {
    expect(findSdlDefinition(model(SDL), { lineNumber: 2, column: 32 })?.startLineNumber).toBe(5);
  });

  it('finds nothing in SDL that does not parse or in other editors', () => {
    expect(
      findSdlDefinition(model('type Query { me: User'), { lineNumber: 1, column: 19 }),
    ).toBeNull();
    expect(findSdlDefinition(model(SDL, 'file'), { lineNumber: 2, column: 19 })).toBeNull();
  });
});
