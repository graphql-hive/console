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

export const extractMetadata = (
  documentAst: DocumentNode,
): Record<string, Array<{ name: string; content: string }>> => {
  const schemaCoordinateMetadataMappings: Record<
    string,
    Array<{ name: string; content: string }>
  > = {};
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
              });
            }
            return acc;
          },
          [] as Array<{ name: string; content: string }>,
        );
      if (metadata) {
        schemaCoordinateMetadataMappings[schemaCoordinate] = metadata;
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

export const mergeMetadata = (
  ...subgraphs: Record<string, Array<{ name: string; content: string }>>[]
) => {
  const combined: Record<string, Array<{ name: string; content: string }>> = {};
  for (const subgraph of subgraphs) {
    for (const [coordinate, metadata] of Object.entries(subgraph)) {
      const existing = combined[coordinate];
      combined[coordinate] = existing === undefined ? metadata : [...existing, ...metadata];
    }
  }
  return combined;
};
