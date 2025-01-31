import { DocumentNode, parse, StringValueNode, visit } from 'graphql';
import { detectLinkedImplementations, FEDERATION_V1, LinkableSpec } from '../index';

const metaSpec = new LinkableSpec('https://specs.graphql-hive.com/metadata', {
  [FEDERATION_V1]: _resolveImportName => (_typeDefs: DocumentNode) => {
    return 'Missing federation 2 support';
  },

  // The return value could be used to map sdl, collect information, or create a graphql yoga plugin.
  // In this test, it's used to collect metadata information from the schema.
  'v0.1': resolveImportName => (typeDefs: DocumentNode) => {
    const collectedMeta: Record<string, Record<string, string>> = {};
    const metaName = resolveImportName('@meta');
    const exampleName = resolveImportName('@example');
    visit(typeDefs, {
      FieldDefinition: node => {
        let metaData: Record<string, string> = {};
        const fieldName = node.name.value;
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

        const example = node.directives?.find(d => d.name.value === exampleName);
        if (example) {
          metaData['eg'] =
            (
              example.arguments?.find(a => a.name.value === 'eg')?.value as
                | StringValueNode
                | undefined
            )?.value ?? '??';
        }
        if (Object.keys(metaData).length) {
          collectedMeta[fieldName] ??= {};
          collectedMeta[fieldName] = Object.assign(collectedMeta[fieldName], metaData);
        }
        return;
      },
    });
    // collect metadata
    return `running on v0.1.\nFound metadata: ${JSON.stringify(collectedMeta)}`;
  },
  'v0.2': _resolveImportName => (_typeDefs: DocumentNode) => {
    // collect metadata
    return `running on v0.2...`;
  },
  v0_3: _resolveImportName => (_: DocumentNode) => 'Version 0.3 used',
});

test('LinkableSpec and detectLinkedImplementations can be used to apply linked schema in Federation 2.x', () => {
  const sdl = `
    directive @meta(name: String!, content: String!) on SCHEMA | FIELD
    directive @metadata__example(eg: String!) on FIELD
    extend schema
      @link(url: "https://specs.apollo.dev/federation/v2.3")
      @link(url: "https://specs.graphql-hive.com/metadata/v0.1", import: ["@meta"])

    type Query {
      ping: String @meta(name: "owner", content: "hive-console-team")
      pong: String @metadata__example(eg: "1...2...3... Pong")
    }
  `;
  const typeDefs = parse(sdl);
  const linked = detectLinkedImplementations(typeDefs, [metaSpec]);
  expect(linked.map(link => link(typeDefs))).toMatchInlineSnapshot(`
    [
      running on v0.1.
    Found metadata: {"ping":{"name":"owner","content":"hive-console-team"},"pong":{"eg":"1...2...3... Pong"}}},
    ]
  `);
});

test('LinkableSpec and detectLinkedImplementations can be used to apply linked schema in schemas that are missing the link directive', () => {
  const sdl = `
    directive @meta(name: String!, content: String!) on SCHEMA | FIELD

    type Query {
      ping: String @meta(name: "owner", content: "hive-console-team")
    }
  `;
  const typeDefs = parse(sdl);
  const linked = detectLinkedImplementations(typeDefs, [metaSpec]);
  expect(linked.map(link => link(typeDefs))).toMatchInlineSnapshot(`
    [
      Missing federation 2 support,
    ]
  `);
});

test('LinkableSpec supports underscores in versions', () => {
  const sdl = `
    directive @meta(name: String!, content: String!) on SCHEMA | FIELD
    extend schema
      @link(url: "https://specs.apollo.dev/federation/v2.3")
      @link(url: "https://specs.graphql-hive.com/metadata/v0.3", import: ["@meta"])

    type Query {
      ping: String @meta(name: "owner", content: "hive-console-team")
    }
  `;
  const typeDefs = parse(sdl);
  const linked = detectLinkedImplementations(typeDefs, [metaSpec]);
  expect(linked.map(link => link(typeDefs))).toMatchInlineSnapshot(`
    [
      Version 0.3 used,
    ]
  `);
});
