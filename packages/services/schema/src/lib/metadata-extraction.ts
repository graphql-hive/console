import {
  ConstDirectiveNode,
  FieldDefinitionNode,
  Kind,
  NameNode,
  StringValueNode,
  visit,
  type DocumentNode,
} from 'graphql';
import { extractLinkImplementations } from '@graphql-hive/federation-link-utils';

export type SubgraphMetadata = Map<
  string,
  Array<{ name: string; content: string; source: string }>
>;

/**
 * Pulls metadata out of a Graphql AST. @meta can be imported via @link using the Federation spec.
 * I.e. extend schema @link(url: "https://specs.graphql-hive.com/hive", import: ["@meta"])
 */
export const extractMetadata = (documentAst: DocumentNode, source: string): SubgraphMetadata => {
  const schemaCoordinateMetadataMappings: SubgraphMetadata = new Map();
  const { resolveImportName } = extractLinkImplementations(documentAst);
  const metaDirectiveName = resolveImportName('https://specs.graphql-hive.com/hive', '@meta');

  const interfaceAndObjectHandler = (node: {
    readonly fields?: ReadonlyArray<FieldDefinitionNode> | undefined;
    readonly directives?: ReadonlyArray<ConstDirectiveNode> | undefined;
    readonly name: NameNode;
  }) => {
    if (node.fields === undefined) {
      return false;
    }

    for (const fieldNode of node.fields) {
      const schemaCoordinate = `${node.name.value}.${fieldNode.name.value}`;

      // collect metadata applied to fields. @note that during orchestration, all metadata from the schema, type, and interface nodes
      // are copied to the corresponding field nodes. This is because 1) after composition this inheritance info is lost (or at least more
      // difficult to calculate because youd have to use the join__ directives.), 2) to make this quicker, and 3) to more clearly show metadata
      // in the SDL.
      const metadata = fieldNode.directives
        ?.filter(directive => directive.name.value === metaDirectiveName)
        .reduce(
          (acc, meta) => {
            const metaNameArg = meta.arguments?.find(
              arg => arg.name.value === 'name' && arg.value.kind === Kind.STRING,
            );
            const metaContentArg = meta.arguments?.find(
              arg => arg.name.value === 'content' && arg.value.kind === Kind.STRING,
            );
            // Ignore if the directive is missing data or is malformed for now. This may change in the future
            //  but this metadata isnt considered a critical part of the schema just yet.
            if (metaNameArg && metaContentArg) {
              acc.push({
                name: (metaNameArg.value as StringValueNode).value,
                content: (metaContentArg.value as StringValueNode).value,
                source,
              });
            }
            return acc;
          },
          [] as Array<{ name: string; content: string; source: string }>,
        );
      if (metadata) {
        schemaCoordinateMetadataMappings.set(schemaCoordinate, metadata);
      }
    }
  };

  visit(documentAst, {
    ObjectTypeDefinition(node) {
      return interfaceAndObjectHandler(node);
    },
    InterfaceTypeDefinition(node) {
      return interfaceAndObjectHandler(node);
    },
  });
  return schemaCoordinateMetadataMappings;
};

export const mergeMetadata = (...subgraphs: SubgraphMetadata[]): SubgraphMetadata => {
  const combined: SubgraphMetadata = new Map();
  for (const subgraph of subgraphs) {
    for (const [coordinate, metadata] of subgraph) {
      if (!combined.has(coordinate)) {
        combined.set(coordinate, []);
      }
      combined.get(coordinate)!.push(...metadata);
    }
  }
  return combined;
};
