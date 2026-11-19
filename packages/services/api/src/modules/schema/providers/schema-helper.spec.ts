import 'reflect-metadata';
import { describe, expect, test } from 'vitest';
import { GraphQLDocumentStringInvalidError } from '../../../shared/entities';
import { SchemaHelper } from './schema-helper';

describe('SchemaHelper.createChecksum', () => {
  const schema = {
    id: 'schema-id',
    sdl: /* GraphQL */ `
      type Query {
        ping: String
      }
    `,
    serviceName: null,
    serviceUrl: null,
  } as const;

  test('treats formatting-equivalent metadata as the same schema', () => {
    const helper = new SchemaHelper();

    expect(helper.createChecksum({ ...schema, metadata: '{"a":1,"b":2}' })).toBe(
      helper.createChecksum({ ...schema, metadata: '{ "b": 2, "a": 1 }' }),
    );
  });

  test('returns a checksum for metadata that is not valid JSON', () => {
    const helper = new SchemaHelper();
    const invalidMetadata = { ...schema, metadata: '{ not json' };

    expect(helper.createChecksum(invalidMetadata)).toEqual(expect.any(String));
    expect(helper.createChecksum(invalidMetadata)).not.toBe(
      helper.createChecksum({ ...schema, metadata: '{"a":1}' }),
    );
  });

  test('is the same for schemas that only differ in the order of definitions', () => {
    const helper = new SchemaHelper();

    expect(
      helper.createChecksum({
        ...schema,
        sdl: 'type Query { a: String b: String } type Foo { c: String }',
        metadata: null,
      }),
    ).toBe(
      helper.createChecksum({
        ...schema,
        sdl: 'type Foo { c: String } type Query { b: String a: String }',
        metadata: null,
      }),
    );
  });

  test('differs for different service names and urls', () => {
    const helper = new SchemaHelper();
    const input = { ...schema, serviceName: 'a', serviceUrl: 'http://a', metadata: null };

    expect(helper.createChecksum(input)).not.toBe(
      helper.createChecksum({ ...input, serviceName: 'b' }),
    );
    expect(helper.createChecksum(input)).not.toBe(
      helper.createChecksum({ ...input, serviceUrl: 'http://b' }),
    );
  });
});

describe('SchemaHelper.hashSDL', () => {
  test('ignores the order of definitions, fields, arguments and enum values', () => {
    const helper = new SchemaHelper();

    expect(
      helper.hashSDL('type Query { b: String a(x: Int, y: Int): String } enum Foo { B A }'),
    ).toBe(helper.hashSDL('enum Foo { A B } type Query { a(y: Int, x: Int): String b: String }'));
  });

  test('differs for different schemas', () => {
    const helper = new SchemaHelper();

    expect(helper.hashSDL('type Query { a: String }')).not.toBe(
      helper.hashSDL('type Query { a: Int }'),
    );
  });

  test('throws for invalid SDL', () => {
    const helper = new SchemaHelper();

    expect(() => helper.hashSDL('type Query {')).toThrow(GraphQLDocumentStringInvalidError);
  });
});

describe('SchemaHelper.createSchemaObject', () => {
  const sdl = 'type Query { ping: String }';

  test('reuses the parsed document for the same SDL regardless of the other fields', () => {
    const helper = new SchemaHelper();

    const a = helper.createSchemaObject({ sdl, serviceName: 'a', serviceUrl: 'http://a' });
    const b = helper.createSchemaObject({ sdl, serviceName: null, serviceUrl: null });

    expect(a.document).toBe(b.document);
    expect(a).toEqual({ document: a.document, raw: sdl, source: 'a', url: 'http://a' });
    expect(b).toEqual({ document: a.document, raw: sdl, source: '*', url: null });
  });

  test('returns a new object on each call so reassigning a field does not leak to other callers', () => {
    const helper = new SchemaHelper();

    const a = helper.createSchemaObject({ sdl });
    a.document = { kind: a.document.kind, definitions: [] };

    expect(helper.createSchemaObject({ sdl }).document.definitions).toHaveLength(1);
  });

  test('throws for invalid SDL', () => {
    const helper = new SchemaHelper();

    expect(() => helper.createSchemaObject({ sdl: 'type Query {' })).toThrow(
      GraphQLDocumentStringInvalidError,
    );
  });
});

describe('SchemaHelper.prettifySDL', () => {
  test('prints valid SDL', () => {
    const helper = new SchemaHelper();

    expect(helper.prettifySDL('type Query{ping:String}')).toBe('type Query {\n  ping: String\n}');
  });

  test('returns invalid SDL as-is', () => {
    const helper = new SchemaHelper();

    expect(helper.prettifySDL('type Query {')).toBe('type Query {');
  });
});
