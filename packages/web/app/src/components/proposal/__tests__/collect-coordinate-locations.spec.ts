import { buildSchema, Source } from 'graphql';
import { collectCoordinateLocations } from '../collect-coordinate-locations';

const coordinatesFromSDL = (sdl: string) => {
  const schema = buildSchema(sdl);
  return collectCoordinateLocations(schema, new Source(sdl));
};

describe('schema coordinate location collection', () => {
  describe('should include the location of', () => {
    test('types', () => {
      const sdl = /** GraphQL */ `
        type Query {
          foo: Foo
        }
        type Foo {
          id: ID!
        }
      `;
      const coords = coordinatesFromSDL(sdl);
      expect(coords.get('Foo')).toBe(5);
    });

    test('fields', () => {
      const sdl = /** GraphQL */ `
        type Query {
          foo: Foo
        }

        type Foo {
          id: ID!
        }
      `;
      const coords = coordinatesFromSDL(sdl);
      expect(coords.get('Query.foo')).toBe(3);
    });

    test('arguments', () => {
      const sdl = /** GraphQL */ `
        type Query {
          foo(bar: Boolean): Boolean
        }
      `;
      const coords = coordinatesFromSDL(sdl);
      expect(coords.get('Query.foo.bar')).toBe(3);
    });

    test('scalars', () => {
      const sdl = /** GraphQL */ `
        scalar Foo
        type Query {
          foo(bar: Boolean): Boolean
        }
      `;
      const coords = coordinatesFromSDL(sdl);
      expect(coords.get('Foo')).toBe(2);
    });

    test('enums', () => {
      const sdl = /** GraphQL */ `
        enum Foo {
          FIRST
          SECOND
          THIRD
        }
        type Query {
          foo(bar: Boolean): Foo
        }
      `;
      const coords = coordinatesFromSDL(sdl);
      expect(coords.get('Foo')).toBe(2);
      expect(coords.get('Foo.FIRST')).toBe(3);
      expect(coords.get('Foo.SECOND')).toBe(4);
      expect(coords.get('Foo.THIRD')).toBe(5);
    });

    test('unions', () => {
      const sdl = /** GraphQL */ `
        union Foo =
          | Bar
          | Blar
        type Bar {
          bar: Boolean
        }
        type Blar {
          blar: String
        }
        type Query {
          foo: Foo
        }
      `;
      const coords = coordinatesFromSDL(sdl);
      expect(coords.get('Foo')).toBe(2);
      // @note The AST is limited and does not give the location of union values.
      expect(coords.get('Foo.Bar')).toBe(2);
      expect(coords.get('Foo.Blar')).toBe(2);
    });

    test('subscriptions', () => {
      const sdl = /** GraphQL */ `
        type Subscription {
          foo: String
        }
      `;
      const coords = coordinatesFromSDL(sdl);
      expect(coords.get('Subscription.foo')).toBe(3);
    });
  });
});
