import { parse } from 'graphql';
import { extractLinkImplementations } from '@graphql-hive/federation-link-utils';
import { addInaccessibleToUnreachableTypes } from '../add-inaccessible-to-unreachable-types';
import { composeFederationV2 } from '../compose';

test('Filters based on tags', async () => {
  let compositionResult = composeFederationV2(
    [
      {
        name: 'user',
        url: 'https://user-example.graphql-hive.com',
        typeDefs: parse(`
        type Query {
          user: User
        }
        type User {
          id: ID!
          name: String
        }

        type Unused {
          foo: String
        }
      `),
      },
    ],
    console as any,
  );

  expect(compositionResult.type).toBe('success');
  if (compositionResult.type === 'success') {
    let supergraphSDL = parse(compositionResult.result.supergraph);
    const { resolveImportName } = extractLinkImplementations(supergraphSDL);
    compositionResult = addInaccessibleToUnreachableTypes(
      resolveImportName,
      compositionResult,
      supergraphSDL,
    );
    expect(compositionResult.result.supergraph).toMatchInlineSnapshot(`
      schema @link(url: "https://specs.apollo.dev/link/v1.0") @link(url: "https://specs.apollo.dev/join/v0.3", for: EXECUTION) {
        query: Query
      }

      directive @join__enumValue(graph: join__Graph!) repeatable on ENUM_VALUE

      directive @join__field(graph: join__Graph, requires: join__FieldSet, provides: join__FieldSet, type: String, external: Boolean, override: String, usedOverridden: Boolean) repeatable on FIELD_DEFINITION | INPUT_FIELD_DEFINITION

      directive @join__graph(name: String!, url: String!) on ENUM_VALUE

      directive @join__implements(graph: join__Graph!, interface: String!) repeatable on OBJECT | INTERFACE

      directive @join__type(graph: join__Graph!, key: join__FieldSet, extension: Boolean! = false, resolvable: Boolean! = true, isInterfaceObject: Boolean! = false) repeatable on OBJECT | INTERFACE | UNION | ENUM | INPUT_OBJECT | SCALAR

      directive @join__unionMember(graph: join__Graph!, member: String!) repeatable on UNION

      scalar join__FieldSet

      directive @link(url: String, as: String, for: link__Purpose, import: [link__Import]) repeatable on SCHEMA

      scalar link__Import

      enum link__Purpose {
        """
        \`SECURITY\` features provide metadata necessary to securely resolve fields.
        """
        SECURITY
        """
        \`EXECUTION\` features provide metadata necessary for operation execution.
        """
        EXECUTION
      }

      enum join__Graph {
        USER @join__graph(name: "user", url: "https://user-example.graphql-hive.com")
      }

      type Query @join__type(graph: USER) {
        user: User
      }

      type User @join__type(graph: USER) {
        id: ID!
        name: String
      }

      type Unused @join__type(graph: USER) @inaccessible {
        foo: String
      }
    `);
    expect(compositionResult.result.sdl).toMatchInlineSnapshot(`
      type Query {
        user: User
      }

      type User {
        id: ID!
        name: String
      }
    `);
  }
});
