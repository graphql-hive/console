import { buildSchema, parse, TypeInfo } from 'graphql';
import { collectSchemaCoordinates } from '../src/client/collect-schema-coordinates';

describe('collectSchemaCoordinates', () => {
  test('single primitive field schema coordinate', () => {
    const schema = buildSchema(/* GraphQL */ `
      type Query {
        hello: String
      }
    `);
    const result = collectSchemaCoordinates({
      documentNode: parse(/* GraphQL */ `
        query {
          hello
        }
      `),
      schema,
      processVariables: false,
      variables: null,
      typeInfo: new TypeInfo(schema),
    });

    expect(Array.from(result)).toEqual(['Query.hello']);
  });
  test('two primitive field schema coordinates', () => {
    const schema = buildSchema(/* GraphQL */ `
      type Query {
        hello: String
        hi: String
      }
    `);
    const result = collectSchemaCoordinates({
      documentNode: parse(/* GraphQL */ `
        query {
          hello
          hi
        }
      `),
      schema,
      processVariables: false,
      variables: null,
      typeInfo: new TypeInfo(schema),
    });

    expect(Array.from(result)).toEqual(['Query.hello', 'Query.hi']);
  });
  test('primitive field with arguments schema coordinates', () => {
    const schema = buildSchema(/* GraphQL */ `
      type Query {
        hello(message: String): String
      }
    `);
    const result = collectSchemaCoordinates({
      documentNode: parse(/* GraphQL */ `
        query {
          hello(message: "world")
        }
      `),
      schema,
      processVariables: false,
      variables: null,
      typeInfo: new TypeInfo(schema),
    });
    expect(Array.from(result)).toEqual([
      'Query.hello',
      'Query.hello.message!',
      'Query.hello.message',
      'String',
    ]);
  });

  test('leaf field (enum)', () => {
    const schema = buildSchema(/* GraphQL */ `
      type Query {
        hello: Option
      }

      enum Option {
        World
        You
      }
    `);
    const result = collectSchemaCoordinates({
      documentNode: parse(/* GraphQL */ `
        query {
          hello
        }
      `),
      schema,
      processVariables: false,
      variables: null,
      typeInfo: new TypeInfo(schema),
    });

    expect(Array.from(result)).toEqual(['Query.hello', 'Option.World', 'Option.You']);
  });

  test('collected fields of interface selection set does not contain exact resolutions (User.id, Animal.id)', () => {
    const schema = buildSchema(/* GraphQL */ `
      type Query {
        node: Node
      }

      interface Node {
        id: ID!
      }

      type User implements Node {
        id: ID!
      }

      type Animal implements Node {
        id: ID!
      }
    `);
    const result = collectSchemaCoordinates({
      documentNode: parse(/* GraphQL */ `
        query {
          node {
            id
          }
        }
      `),
      schema,
      processVariables: false,
      variables: null,
      typeInfo: new TypeInfo(schema),
    });
    expect(Array.from(result)).toEqual(['Query.node', 'Node.id']);
  });
  test('collected fields contain exact resolutions on inline fragment spread', () => {
    const schema = buildSchema(/* GraphQL */ `
      type Query {
        node: Node
      }

      interface Node {
        id: ID!
      }

      type User implements Node {
        id: ID!
      }

      type Animal implements Node {
        id: ID!
      }
    `);
    const result = collectSchemaCoordinates({
      documentNode: parse(/* GraphQL */ `
        query {
          node {
            id
            ... on User {
              id
            }
          }
        }
      `),
      schema,
      processVariables: false,
      variables: null,
      typeInfo: new TypeInfo(schema),
    });
    expect(Array.from(result).sort()).toEqual(['Query.node', 'Node.id', 'User.id'].sort());
  });

  test('custom scalar as argument', () => {
    const schema = buildSchema(/* GraphQL */ `
      type Query {
        random(json: JSON): String
      }
      scalar JSON
    `);
    const result = collectSchemaCoordinates({
      documentNode: parse(/* GraphQL */ `
        query {
          random(json: { key: { value: "value" } })
        }
      `),
      schema,
      processVariables: false,
      variables: null,
      typeInfo: new TypeInfo(schema),
    });
    expect(Array.from(result).sort()).toEqual(
      ['Query.random', 'Query.random.json', 'Query.random.json!', 'JSON'].sort(),
    );
  });

  test('custom scalar in input object field', () => {
    const schema = buildSchema(/* GraphQL */ `
      type Query {
        random(input: I): String
      }

      input I {
        json: JSON
      }

      scalar JSON
    `);
    const result = collectSchemaCoordinates({
      documentNode: parse(/* GraphQL */ `
        query {
          random(input: { json: { key: { value: "value" } } })
        }
      `),
      schema,
      processVariables: false,
      variables: null,
      typeInfo: new TypeInfo(schema),
    });
    expect(Array.from(result).sort()).toEqual(
      [
        'Query.random',
        'Query.random.input',
        'Query.random.input!',
        'I.json',
        'I.json!',
        'JSON',
      ].sort(),
    );
  });

  test('deeply nested inputs', () => {
    const schema = buildSchema(/* GraphQL */ `
      type Query {
        random(a: A): String
      }

      input A {
        b: B
      }

      input B {
        c: C
      }

      input C {
        d: String
      }
    `);
    const result = collectSchemaCoordinates({
      documentNode: parse(/* GraphQL */ `
        query {
          random(a: { b: { c: { d: "D" } } })
        }
      `),
      schema,
      processVariables: false,
      variables: null,
      typeInfo: new TypeInfo(schema),
    });
    expect(Array.from(result).sort()).toEqual(
      [
        'Query.random',
        'Query.random.a',
        'Query.random.a!',
        'A.b',
        'A.b!',
        'B.c',
        'B.c!',
        'C.d',
        'C.d!',
        'String',
      ].sort(),
    );
  });

  test('required variable as argument', () => {
    const schema = buildSchema(/* GraphQL */ `
      type Query {
        random(a: String): String
      }
    `);
    const result = collectSchemaCoordinates({
      documentNode: parse(/* GraphQL */ `
        query Foo($a: String!) {
          random(a: $a)
        }
      `),
      schema,
      processVariables: true,
      variables: { a: 'B' },
      typeInfo: new TypeInfo(schema),
    });
    expect(Array.from(result).sort()).toEqual(
      ['Query.random', 'Query.random.a', 'Query.random.a!', 'String'].sort(),
    );
  });

  test('required variable as input field', () => {
    const schema = buildSchema(/* GraphQL */ `
      type Query {
        random(a: A): String
      }

      input A {
        b: String
      }
    `);
    const result = collectSchemaCoordinates({
      documentNode: parse(/* GraphQL */ `
        query Foo($b: String!) {
          random(a: { b: $b })
        }
      `),
      schema,
      processVariables: true,
      variables: { b: 'B' },
      typeInfo: new TypeInfo(schema),
    });
    expect(Array.from(result).sort()).toEqual(
      ['Query.random', 'Query.random.a', 'Query.random.a!', 'A.b', 'A.b!', 'String'].sort(),
    );
  });

  test('undefined variable as input field', () => {
    const schema = buildSchema(/* GraphQL */ `
      type Query {
        random(a: A): String
      }

      input A {
        b: String
      }
    `);
    const result = collectSchemaCoordinates({
      documentNode: parse(/* GraphQL */ `
        query Foo($b: String!) {
          random(a: { b: $b })
        }
      `),
      schema,
      processVariables: true,
      variables: null,
      typeInfo: new TypeInfo(schema),
    });
    expect(Array.from(result).sort()).toEqual(
      ['Query.random', 'Query.random.a', 'Query.random.a!', 'A.b', 'String'].sort(),
    );
  });

  test('deeply nested variables (processVariables=true)', () => {
    const schema = buildSchema(/* GraphQL */ `
      type Query {
        random(a: A): String
      }

      input A {
        b: B
      }

      input B {
        c: C
      }

      input C {
        d: String
      }
    `);
    const result = collectSchemaCoordinates({
      documentNode: parse(/* GraphQL */ `
        query Random($a: A) {
          random(a: $a)
        }
      `),
      schema,
      processVariables: true,
      variables: { a: { b: { c: { d: 'D' } } } },
      typeInfo: new TypeInfo(schema),
    });
    expect(Array.from(result).sort()).toEqual(
      [
        'Query.random',
        'Query.random.a',
        'Query.random.a!',
        'A.b',
        'A.b!',
        'B.c',
        'B.c!',
        'C.d',
        'C.d!',
        'String',
      ].sort(),
    );
  });

  test('deeply nested variables (processVariables=false)', () => {
    const schema = buildSchema(/* GraphQL */ `
      type Query {
        random(a: A): String
      }

      input A {
        b: B
      }

      input B {
        c: C
      }

      input C {
        d: String
      }
    `);
    const result = collectSchemaCoordinates({
      documentNode: parse(/* GraphQL */ `
        query Random($a: A) {
          random(a: $a)
        }
      `),
      schema,
      processVariables: false,
      variables: { a: { b: { c: { d: 'D' } } } },
      typeInfo: new TypeInfo(schema),
    });
    expect(Array.from(result).sort()).toEqual(
      ['Query.random', 'Query.random.a', 'Query.random.a!', 'A.b', 'B.c', 'C.d', 'String'].sort(),
    );
  });

  test('aliased field', () => {
    const schema = buildSchema(/* GraphQL */ `
      type Query {
        random(a: String): String
      }

      input C {
        d: String
      }
    `);
    const result = collectSchemaCoordinates({
      documentNode: parse(/* GraphQL */ `
        query Random($a: String) {
          foo: random(a: $a)
        }
      `),
      schema,
      processVariables: true,
      variables: { a: 'B' },
      typeInfo: new TypeInfo(schema),
    });
    expect(Array.from(result).sort()).toEqual(
      ['Query.random', 'Query.random.a', 'Query.random.a!', 'String'].sort(),
    );
  });

  test('multiple fields with mixed nullability', () => {
    const schema = buildSchema(/* GraphQL */ `
      type Query {
        random(a: String): String
      }

      input C {
        d: String
      }
    `);
    const result = collectSchemaCoordinates({
      documentNode: parse(/* GraphQL */ `
        query Random($a: String) {
          nullable: random(a: $a)
          nonnullable: random(a: "B")
        }
      `),
      schema,
      processVariables: false,
      variables: { a: null },
      typeInfo: new TypeInfo(schema),
    });
    expect(Array.from(result).sort()).toEqual(
      ['Query.random', 'Query.random.a', 'Query.random.a!', 'String'].sort(),
    );
  });
});
