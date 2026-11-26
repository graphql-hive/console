import { parse } from 'graphql';
import {
  buildSchemaExplorerSnapshot,
  SchemaExplorerSnapshotReader,
} from '@hive/schema-explorer-snapshot';
import { onlyDeprecatedTypes, onlyUnusedTypes } from '../schema-explorer-filters.js';

const snapshot = SchemaExplorerSnapshotReader.fromSnapshot(
  buildSchemaExplorerSnapshot(
    parse(/* GraphQL */ `
      type Query {
        a(x: Int, y: String @deprecated(reason: "no")): String
        b: Int @deprecated
        c: Node
        d: SearchResult
        e(in: In): E
      }
      interface Node {
        id: ID!
      }
      type Impl implements Node {
        id: ID!
      }
      input In {
        a: Int = 1
        b: String @deprecated
      }
      enum E {
        A
        B @deprecated
      }
      enum F {
        X
      }
      union SearchResult = Impl
      scalar Date
    `),
    null,
  ),
);
const sdlTypes = snapshot.getTypeEntities(snapshot.getTypeNames({ withBuiltInScalars: false }));

/** Type name to its remaining fields/values/members, for compact assertions. */
function outline(types: ReturnType<typeof onlyUnusedTypes>) {
  return Object.fromEntries(
    types.map(type => {
      if ('fields' in type) {
        return [
          type.name,
          type.fields.map(field =>
            'args' in field && field.args.length
              ? `${field.name}(${field.args.map(arg => arg.name).join(', ')})`
              : field.name,
          ),
        ];
      }
      if ('values' in type) {
        return [type.name, type.values.map(value => value.name)];
      }
      if ('members' in type) {
        return [type.name, type.members.map(member => member.name)];
      }
      return [type.name, []];
    }),
  );
}

describe('onlyUnusedTypes', () => {
  test('nothing used keeps every type, but no built-in scalars', () => {
    expect(outline(onlyUnusedTypes(sdlTypes, new Set()))).toEqual({
      Query: ['a(x, y)', 'b', 'c', 'd', 'e(in)'],
      Node: ['id'],
      Impl: ['id'],
      In: ['a', 'b'],
      E: ['A', 'B'],
      F: ['X'],
      SearchResult: ['Impl'],
      Date: [],
    });
  });

  test('a used field stays while one of its arguments is unused', () => {
    expect(outline(onlyUnusedTypes(sdlTypes, new Set(['Query.a', 'Query.a.x'])))).toMatchObject({
      Query: ['a(y)', 'b', 'c', 'd', 'e(in)'],
    });
    expect(
      outline(onlyUnusedTypes(sdlTypes, new Set(['Query.a', 'Query.a.x', 'Query.a.y']))),
    ).toMatchObject({ Query: ['b', 'c', 'd', 'e(in)'] });
  });

  test('types without fields left are removed; enums, unions and scalars go as a whole', () => {
    const outlined = outline(
      onlyUnusedTypes(
        sdlTypes,
        new Set(['Node.id', 'In.a', 'In.b', 'E', 'F.X', 'SearchResult', 'Date']),
      ),
    );
    expect(Object.keys(outlined)).toEqual(['F', 'Impl', 'Query']);
    // Enum values are not filtered individually.
    expect(outlined.F).toEqual(['X']);
  });
});

describe('getTypesWithUnusedCoordinates', () => {
  const allCoordinates = sdlTypes.flatMap(type => [
    type.name,
    ...('fields' in type
      ? type.fields.flatMap(field => [
          `${type.name}.${field.name}`,
          ...('args' in field
            ? field.args.map(arg => `${type.name}.${field.name}.${arg.name}`)
            : []),
        ])
      : []),
    ...('values' in type ? type.values.map(value => `${type.name}.${value.name}`) : []),
  ]);

  test('filtering only these types gives the same result as filtering all types', () => {
    let seed = 7;
    const random = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    for (let i = 0; i < 300; i++) {
      const ratio = random();
      const used = new Set(allCoordinates.filter(() => random() < ratio));
      expect(
        onlyUnusedTypes(
          snapshot.getTypeEntities(snapshot.getTypesWithUnusedCoordinates(used)),
          used,
        ),
      ).toEqual(onlyUnusedTypes(sdlTypes, used));
    }
  });

  test('skips types that are entirely used and built-in scalars', () => {
    expect(snapshot.getTypesWithUnusedCoordinates(new Set())).toEqual(
      sdlTypes.map(type => type.name),
    );
    expect(snapshot.getTypesWithUnusedCoordinates(new Set(allCoordinates))).toEqual([]);
    expect(
      snapshot.getTypesWithUnusedCoordinates(
        new Set(allCoordinates.filter(coordinate => coordinate !== 'Query.a.x')),
      ),
    ).toEqual(['Query']);
  });
});

describe('onlyDeprecatedTypes', () => {
  test('only needs the types in deprecatedTypes', () => {
    expect(snapshot.deprecatedTypes).toEqual(['E', 'In', 'Query']);
    expect(onlyDeprecatedTypes(snapshot.getTypeEntities(snapshot.deprecatedTypes))).toEqual(
      onlyDeprecatedTypes(sdlTypes),
    );
  });

  test('keeps deprecated parts and fields with deprecated arguments', () => {
    expect(outline(onlyDeprecatedTypes(sdlTypes))).toEqual({
      Query: ['a(y)', 'b'],
      In: ['b'],
      // Enums with a deprecated value are kept with all values.
      E: ['A', 'B'],
    });
  });
});

test('input field defaults are coerced values', () => {
  const input = sdlTypes.find(type => type.name === 'In');
  expect(input).toMatchObject({ fields: [{ name: 'a', defaultValue: 1 }, { name: 'b' }] });
});
