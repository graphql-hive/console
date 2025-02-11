import { parse, StringValueNode, visit } from 'graphql';
import { extractLinkImplementations, FEDERATION_V1 } from '../src/index';

describe('extractLinkImplementations', () => {
  const sdl = `
    directive @meta(name: String!, content: String!) on SCHEMA | FIELD
    directive @metadata__example(eg: String!) on FIELD
    extend schema
      @link(url: "https://specs.apollo.dev/federation/v2.3")
      @link(url: "https://specs.graphql-hive.com/metadata/v0.1", import: ["@meta"])
      @link(url: "https://specs.graphql-hive.com/foo/v1.1")

    type Query {
      ping: String @meta(name: "owner", content: "hive-console-team")
      pong: String @metadata__example(eg: "1...2...3... Pong")
    }
  `;
  const typeDefs = parse(sdl);
  const { matchesImplementation, resolveImportName } = extractLinkImplementations(typeDefs);

  test('can match alpha (v0.x) versions correctly', () => {
    expect(matchesImplementation('https://specs.graphql-hive.com/metadata', 'v0.1')).toBe(true);
    expect(matchesImplementation('https://specs.graphql-hive.com/metadata', 'v0.2')).toBe(false);
  });

  test('can match non-alpha (v1.x+) versions correctly', () => {
    expect(matchesImplementation('https://specs.graphql-hive.com/metadata', 'v1.0')).toBe(false);
    expect(
      matchesImplementation('https://specs.graphql-hive.com/foo', { major: 1, minor: 0 }),
    ).toBe(true);
    expect(matchesImplementation('https://specs.graphql-hive.com/foo', 'v1.1')).toBe(true);
    expect(
      matchesImplementation('https://specs.graphql-hive.com/foo', { major: 1, minor: 2 }),
    ).toBe(false);
    expect(
      matchesImplementation('https://specs.graphql-hive.com/foo', { major: 2, minor: 0 }),
    ).toBe(false);
  });

  test('does not match FEDERATION_V1 version if linked', () => {
    expect(matchesImplementation('https://specs.graphql-hive.com/metadata', FEDERATION_V1)).toBe(
      false,
    );
  });

  test('matches FEDERATION_V1 version if no federation link is provided', () => {
    const sdl = `
      directive @meta(name: String!, content: String!) on SCHEMA | FIELD

      type Query {
        ping: String @meta(name: "owner", content: "hive-console-team")
      }
    `;
    const typeDefs = parse(sdl);
    const { matchesImplementation, resolveImportName } = extractLinkImplementations(typeDefs);
    expect(matchesImplementation('https://specs.graphql-hive.com', FEDERATION_V1)).toBe(true);
    expect(resolveImportName('https://specs.graphql-hive.com', '@meta')).toBe('meta');
  });

  test('does not match NULL version if linked to a specific version', () => {
    expect(matchesImplementation('https://specs.graphql-hive.com/metadata', null)).toBe(false);
  });

  test('matches NULL version if link does not include a specific version', () => {
    const sdl = `
      directive @meta(name: String!, content: String!) on SCHEMA | FIELD
      extend schema
        @link(url: "https://specs.apollo.dev/federation/v2.3")
        @link(url: "https://specs.graphql-hive.com", import: ["@meta"])

      type Query {
        ping: String @meta(name: "owner", content: "hive-console-team")
      }
    `;
    const typeDefs = parse(sdl);
    const { matchesImplementation } = extractLinkImplementations(typeDefs);
    expect(matchesImplementation('https://specs.graphql-hive.com', null)).toBe(true);
  });

  test('can resolve name of import', () => {
    expect(resolveImportName('https://specs.graphql-hive.com/metadata', '@meta')).toBe('meta');
  });

  test('can resolve a namespaced import', () => {
    expect(resolveImportName('https://specs.graphql-hive.com/metadata', '@example')).toBe(
      'metadata__example',
    );
  });

  test('can be used to develop plugins', () => {
    if (matchesImplementation('https://specs.graphql-hive.com/metadata', 'v0.1')) {
      const collectedMeta: Record<string, Record<string, string>> = {};
      const metaName = resolveImportName('https://specs.graphql-hive.com/metadata', '@meta');
      visit(typeDefs, {
        FieldDefinition: node => {
          let metaData: Record<string, string> = {};
          const id = node.name.value;
          const meta = node.directives?.find(d => d.name.value === metaName);
          if (meta) {
            metaData['name'] =
              (
                meta.arguments?.find(a => a.name.value === 'name')?.value as
                  | StringValueNode
                  | undefined
              )?.value ?? '??';
            metaData['content'] =
              (
                meta.arguments?.find(a => a.name.value === 'content')?.value as
                  | StringValueNode
                  | undefined
              )?.value ?? '??';
          }
          if (Object.keys(metaData).length) {
            collectedMeta[id] ??= {};
            collectedMeta[id] = Object.assign(collectedMeta[id], metaData);
          }
          return;
        },
      });
      expect(collectedMeta).toMatchInlineSnapshot(`
        {
          ping: {
            content: hive-console-team,
            name: owner,
          },
        }
      `);
    }
  });
});
