import {
  buildASTSchema,
  getIntrospectionQuery,
  GraphQLSchema,
  graphqlSync,
  lexicographicSortSchema,
  parse,
  printSchema,
} from 'graphql';
import { describe, expect, test } from 'vitest';
import { diff, DiffRule } from '@graphql-inspector/core';
import { buildLexicographicallySortedSchema } from '../schema';

/** What `buildLexicographicallySortedSchema` replaces. */
function buildWithLexicographicSortSchema(sdl: string): GraphQLSchema {
  return lexicographicSortSchema(
    buildASTSchema(parse(sdl, { noLocation: true }), { assumeValid: true, assumeValidSDL: true }),
  );
}

function buildWithAstSort(sdl: string): GraphQLSchema {
  return buildLexicographicallySortedSchema(parse(sdl, { noLocation: true }));
}

function introspect(schema: GraphQLSchema) {
  return graphqlSync({
    schema,
    source: getIntrospectionQuery({
      descriptions: true,
      specifiedByUrl: true,
      directiveIsRepeatable: true,
      schemaDescription: true,
      inputValueDeprecation: true,
      oneOf: true,
    }),
  });
}

/** Everything about the schema that depends on the order of its types, directives and their lists. */
function expectSameSchema(actual: GraphQLSchema, expected: GraphQLSchema) {
  expect(Object.keys(actual.getTypeMap())).toEqual(Object.keys(expected.getTypeMap()));
  expect(actual.getDirectives().map(directive => directive.toString())).toEqual(
    expected.getDirectives().map(directive => directive.toString()),
  );
  expect(actual.getDirectives().map(directive => directive.locations)).toEqual(
    expected.getDirectives().map(directive => directive.locations),
  );
  expect(printSchema(actual)).toEqual(printSchema(expected));
  // covers descriptions, deprecations, default values, built-in scalars and introspection types
  expect(introspect(actual)).toEqual(introspect(expected));
}

async function changes(before: GraphQLSchema, after: GraphQLSchema, simplify: boolean) {
  const result = await diff(before, after, simplify ? [DiffRule.simplifyChanges] : []);
  return result.map(change => ({
    type: change.type,
    path: change.path,
    message: change.message,
    meta: change.meta,
    criticality: change.criticality,
  }));
}

async function expectSameChanges(beforeSdl: string, afterSdl: string) {
  for (const simplify of [false, true]) {
    expect(
      await changes(buildWithAstSort(beforeSdl), buildWithAstSort(afterSdl), simplify),
    ).toEqual(
      await changes(
        buildWithLexicographicSortSchema(beforeSdl),
        buildWithLexicographicSortSchema(afterSdl),
        simplify,
      ),
    );
  }
}

const unsortedSdl = /* GraphQL */ `
  """
  Schema description
  """
  schema {
    query: Query
    mutation: Mutation
  }

  directive @tag(
    name: String!
    alpha: Int
  ) repeatable on SCHEMA | OBJECT | FIELD_DEFINITION | ENUM_VALUE | ARGUMENT_DEFINITION | INTERFACE | UNION | INPUT_OBJECT | INPUT_FIELD_DEFINITION | SCALAR | ENUM
  directive @auth on OBJECT | FIELD_DEFINITION

  type Query @tag(name: "q") {
    zeta(z: Int, b: String = "b", a: [ID!]): Type10
    type2: Type2
    alpha: Int @deprecated(reason: "no")
    search(term: String!, filter: Filter10, filter2: Filter2): [SearchResult!]!
    node(id: ID!): Node
    color: Color
    date: Date
  }

  type Mutation {
    update(input: Filter2!): Boolean @auth
  }

  """
  Ten
  """
  type Type10 implements Node & Named @auth {
    name: String
    id: ID!
    b(y: Int @deprecated, x: Int): Int @tag(name: "b") @tag(name: "c")
  }

  type Type2 implements Named & Node {
    name: String
    id: ID!
  }

  interface Named {
    name: String
  }

  interface Node implements Named2 & Named1 {
    id: ID!
  }

  interface Named2 {
    id: ID!
  }

  interface Named1 {
    id: ID!
  }

  union SearchResult = Type2 | Type10

  enum Color {
    RED
    BLUE @deprecated
    GREEN2
    GREEN10
    green
  }

  input Filter10 @oneOf {
    zz: Int
    aa: String
  }

  input Filter2 {
    z: Int = 1
    a: [String!] = ["a"]
    m: Filter10
  }

  scalar Date @specifiedBy(url: "https://example.com")
`;

describe('buildLexicographicallySortedSchema', () => {
  test('is equivalent to lexicographicSortSchema(buildASTSchema())', () => {
    expectSameSchema(buildWithAstSort(unsortedSdl), buildWithLexicographicSortSchema(unsortedSdl));
  });

  test('is equivalent for schemas with type extensions', () => {
    const sdl = /* GraphQL */ `
      type Query {
        b: Int
      }
      extend type Query {
        a: Int
        c(z: Int, a: Int): Int
      }
      extend schema @tag(name: "s")
      directive @tag(name: String!) on SCHEMA
      enum E {
        B
      }
      extend enum E {
        A
      }
    `;
    expectSameSchema(buildWithAstSort(sdl), buildWithLexicographicSortSchema(sdl));
  });

  test('is equivalent for schemas without explicit schema definition and with subscriptions', () => {
    const sdl = /* GraphQL */ `
      type Subscription {
        b: Int
        a: Int
      }
      type Query {
        z: Int
        y: Int
      }
    `;
    expectSameSchema(buildWithAstSort(sdl), buildWithLexicographicSortSchema(sdl));
  });

  test('produces the same changes, in the same order, when diffing', async () => {
    const after = unsortedSdl
      .replace('alpha: Int @deprecated(reason: "no")', 'alpha: String')
      .replace('type2: Type2', 'type2: Type2\n    added(b: Int, a: Int): Int')
      .replace('GREEN10', 'GREEN11')
      .replace('union SearchResult = Type2 | Type10', 'union SearchResult = Type10')
      .replace('m: Filter10', 'm: Filter10!')
      .replace('@tag(name: "b") @tag(name: "c")', '@tag(name: "c")')
      .replace(
        'directive @auth on OBJECT | FIELD_DEFINITION',
        'directive @auth on FIELD_DEFINITION',
      );

    await expectSameChanges(unsortedSdl, after);
    await expectSameChanges(after, unsortedSdl);
  });

  test('is equivalent for randomly ordered schemas', async () => {
    for (let seed = 1; seed <= 30; seed++) {
      const random = createRandom(seed);
      const before = randomSchemaSdl(random);
      const after = randomSchemaSdl(random, before.names);

      expectSameSchema(buildWithAstSort(before.sdl), buildWithLexicographicSortSchema(before.sdl));
      await expectSameChanges(before.sdl, after.sdl);
    }
  });
});

/** Deterministic pseudo random numbers (mulberry32), so failures can be reproduced. */
function createRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Random = ReturnType<typeof createRandom>;

function shuffle<T>(items: T[], random: Random): T[] {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function pick<T>(items: T[], random: Random): T {
  return items[Math.floor(random() * items.length)];
}

/**
 * Generates a schema with names that sort differently with natural and plain comparison
 * (e.g. `T2`, `T10`, `t1`), in random order, with random subsets of fields so two schemas can be diffed.
 */
function randomSchemaSdl(
  random: Random,
  names = {
    types: shuffle(['T1', 'T2', 'T10', 'T11', 'Ta', 'tB', 'T02', 'Node1', 'Node10'], random),
    fields: ['f1', 'f2', 'f10', 'fA', 'fa', 'F', 'f02', 'id'],
    args: ['a1', 'a10', 'a2', 'b', 'B', 'a'],
    values: ['V1', 'V10', 'V2', 'v', 'VA', 'Z9'],
    directives: ['d1', 'd10', 'd2', 'D'],
  },
) {
  const scalarTypes = ['Int', 'String', 'Boolean', 'Float', 'ID', 'Date'];
  const objectTypes = names.types.slice(0, 5);
  const interfaceTypes = names.types.slice(5, 7);
  const inputType = names.types[7];
  const enumType = names.types[8];
  const subset = <T>(items: T[]) => shuffle(items, random).filter(() => random() > 0.3);
  const typeRef = () => {
    const base = pick([...scalarTypes, enumType, ...objectTypes], random);
    return random() > 0.5 ? `${base}!` : random() > 0.5 ? `[${base}!]` : base;
  };
  const args = () => {
    const selected = subset(names.args);
    return selected.length
      ? `(${selected.map(arg => `${arg}: ${pick([...scalarTypes, inputType], random)}`).join(', ')})`
      : '';
  };
  const directives = () =>
    subset(names.directives)
      .map(directive => `@${directive}`)
      .join(' ');
  const fields = (withArgs: boolean) => {
    const selected = subset(names.fields);
    return (selected.length ? selected : ['id'])
      .map(field => `  ${field}${withArgs ? args() : ''}: ${typeRef()} ${directives()}`)
      .join('\n');
  };

  const enumValues = subset(names.values);

  const definitions = [
    `type Query {\n${objectTypes.map(type => `  q${type}${args()}: ${type}`).join('\n')}\n}`,
    ...objectTypes.map(type => {
      const interfaces = subset(interfaceTypes);
      return `type ${type}${interfaces.length ? ` implements ${interfaces.join(' & ')}` : ''} ${directives()} {\n  id: ID\n${fields(true)}\n}`;
    }),
    ...interfaceTypes.map(type => `interface ${type} {\n  id: ID\n}`),
    `input ${inputType} {\n${fields(false)}\n}`,
    `enum ${enumType} {\n${(enumValues.length ? enumValues : ['V1']).join('\n')}\n}`,
    `union U = ${shuffle(objectTypes, random).join(' | ')}`,
    'scalar Date',
    ...shuffle(names.directives, random).map(
      directive =>
        `directive @${directive}${args()} repeatable on ${shuffle(['OBJECT', 'FIELD_DEFINITION', 'INPUT_FIELD_DEFINITION', 'ENUM_VALUE'], random).join(' | ')}`,
    ),
  ];

  return { sdl: shuffle(definitions, random).join('\n\n'), names };
}
