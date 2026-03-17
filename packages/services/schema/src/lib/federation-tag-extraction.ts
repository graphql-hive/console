import {
  Kind,
  visit,
  type ConstDirectiveNode,
  type DirectiveNode,
  type DocumentNode,
  type EnumValueDefinitionNode,
  type FieldDefinitionNode,
  type InputValueDefinitionNode,
  type NameNode,
} from 'graphql';
import { extractLinkImplementations } from '@theguild/federation-composition';

type TagExtractionStrategy = (directiveNode: DirectiveNode) => string | null;

function collectTagsBySchemaCoordinateFromSubgraph(
  documentNode: DocumentNode,
  /** This map will be populated with values. */
  map: SchemaCoordinateToTagsRegistry,
  /** This map will be populated with values. */
  subcoordinatesPerType: SubcoordinatesPerType,
): void {
  const { resolveImportName } = extractLinkImplementations(documentNode);
  const tagDirectiveName = resolveImportName('https://specs.apollo.dev/federation', '@tag');
  const extractTag = createTagDirectiveNameExtractionStrategy(tagDirectiveName);

  function addTypeFields(typeName: string, fields: Set<string>) {
    let typeFields = subcoordinatesPerType.get(typeName);
    if (typeFields === undefined) {
      typeFields = new Set();
      subcoordinatesPerType.set(typeName, typeFields);
    }
    for (const value of fields) {
      typeFields.add(value);
    }
  }

  function addTagsPerSchemaCoordinate(
    schemaCoordinate: string,
    tagValues: Set<string> | undefined,
  ) {
    if (tagValues === undefined) {
      return;
    }

    let values = map.get(schemaCoordinate);
    if (values === undefined) {
      values = new Set();
      map.set(schemaCoordinate, values);
    }
    for (const tagValue of tagValues) {
      values.add(tagValue);
    }
  }

  function getTagsForNode(node: {
    directives?: readonly ConstDirectiveNode[];
  }): Set<string> | undefined {
    const tags = new Set<string>();
    node.directives?.forEach(directiveNode => {
      const tagValue = extractTag(directiveNode);
      if (tagValue === null) {
        return;
      }
      tags.add(tagValue);
    });
    if (tags.size === 0) {
      return undefined;
    }
    return tags;
  }

  function TypeDefinitionHandler(node: {
    name: NameNode;
    directives?: readonly ConstDirectiveNode[];
    fields?: readonly FieldDefinitionNode[] | readonly InputValueDefinitionNode[];
    values?: readonly EnumValueDefinitionNode[];
  }) {
    const tagValues = getTagsForNode(node);
    addTagsPerSchemaCoordinate(node.name.value, tagValues);

    const subCoordinates = new Set<string>();

    node.fields?.forEach(fieldNode => {
      const schemaCoordinate = `${node.name.value}.${fieldNode.name.value}`;
      subCoordinates.add(schemaCoordinate);

      const tagValues = getTagsForNode(fieldNode);
      addTagsPerSchemaCoordinate(schemaCoordinate, tagValues);

      if ('arguments' in fieldNode) {
        fieldNode.arguments?.forEach(argumentNode => {
          const schemaCoordinate = `${node.name.value}.${fieldNode.name.value}(${argumentNode.name.value}:)`;
          subCoordinates.add(schemaCoordinate);

          const tagValues = getTagsForNode(argumentNode);
          addTagsPerSchemaCoordinate(schemaCoordinate, tagValues);
        });
      }
    });
    node.values?.forEach(valueNode => {
      const schemaCoordinate = `${node.name.value}.${valueNode.name.value}`;
      subCoordinates.add(schemaCoordinate);

      const tagValues = getTagsForNode(valueNode);
      addTagsPerSchemaCoordinate(schemaCoordinate, tagValues);
    });

    addTypeFields(node.name.value, subCoordinates);

    return false;
  }

  visit(documentNode, {
    ScalarTypeDefinition: TypeDefinitionHandler,
    ScalarTypeExtension: TypeDefinitionHandler,
    UnionTypeDefinition: TypeDefinitionHandler,
    UnionTypeExtension: TypeDefinitionHandler,
    ObjectTypeDefinition: TypeDefinitionHandler,
    ObjectTypeExtension: TypeDefinitionHandler,
    InterfaceTypeDefinition: TypeDefinitionHandler,
    InterfaceTypeExtension: TypeDefinitionHandler,
    InputObjectTypeDefinition: TypeDefinitionHandler,
    InputObjectTypeExtension: TypeDefinitionHandler,
    EnumTypeDefinition: TypeDefinitionHandler,
    EnumTypeExtension: TypeDefinitionHandler,
  });
}

type SchemaCoordinateToTagsRegistry = Map<
  /* schema coordinate */ string,
  /* tag list */ Set<string>
>;

type SubcoordinatesPerType = Map</* type name */ string, /* schema coordinates */ Set<string>>;

/**
 * Get a map with tags per schema coordinates in all subgraphs.
 */
export function buildSchemaCoordinateTagRegister(
  documentNodes: Array<DocumentNode>,
): SchemaCoordinateToTagsRegistry {
  const schemaCoordinatesToTags: SchemaCoordinateToTagsRegistry = new Map();
  const subcoordinatesPerType: SubcoordinatesPerType = new Map();

  documentNodes.forEach(documentNode =>
    collectTagsBySchemaCoordinateFromSubgraph(
      documentNode,
      schemaCoordinatesToTags,
      subcoordinatesPerType,
    ),
  );

  // The tags of a type are inherited by it's fields and field arguments
  for (const [typeName, subCoordinates] of subcoordinatesPerType) {
    const tags = schemaCoordinatesToTags.get(typeName);
    if (tags === undefined) {
      continue;
    }

    for (const subCoordinate of subCoordinates) {
      let subcoordinateTags = schemaCoordinatesToTags.get(subCoordinate);
      if (!subcoordinateTags) {
        subcoordinateTags = new Set();
        schemaCoordinatesToTags.set(subCoordinate, subcoordinateTags);
      }
      for (const tag of tags) {
        subcoordinateTags.add(tag);
      }
    }
  }

  return schemaCoordinatesToTags;
}

export const extractTagsFromDocument = (
  documentNode: DocumentNode,
  tagStrategy: TagExtractionStrategy,
) => {
  const tags = new Set<string>();

  function collectTagsFromDirective(directiveNode: DirectiveNode) {
    const tag = tagStrategy(directiveNode);
    if (tag) {
      tags.add(tag);
    }
  }

  visit(documentNode, {
    [Kind.DIRECTIVE](directive) {
      collectTagsFromDirective(directive);
    },
  });

  return Array.from(tags);
};

export function createTagDirectiveNameExtractionStrategy(
  directiveName: string,
): TagExtractionStrategy {
  return (directiveNode: DirectiveNode) => {
    if (
      directiveNode.name.value === directiveName &&
      directiveNode.arguments?.[0].name.value === 'name' &&
      directiveNode.arguments?.[0]?.value.kind === Kind.STRING
    ) {
      return directiveNode.arguments[0].value.value ?? null;
    }
    return null;
  };
}
