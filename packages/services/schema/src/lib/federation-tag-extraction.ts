import {
  EnumTypeExtensionNode,
  InputObjectTypeExtensionNode,
  InterfaceTypeExtensionNode,
  Kind,
  ObjectTypeExtensionNode,
  print,
  visit,
  type ConstDirectiveNode,
  type DirectiveNode,
  type DocumentNode,
  type EnumTypeDefinitionNode,
  type FieldDefinitionNode,
  type InputObjectTypeDefinitionNode,
  type InputValueDefinitionNode,
  type InterfaceTypeDefinitionNode,
  type ObjectTypeDefinitionNode,
  type ScalarTypeDefinitionNode,
  type UnionTypeDefinitionNode,
} from 'graphql';
import { extractLinkImplementations } from '@theguild/federation-composition';

type TagExtractionStrategy = (directiveNode: DirectiveNode) => string | null;

function createTransformTagDirectives(tagDirectiveName: string, inaccessibleDirectiveName: string) {
  return function transformTagDirectives(
    node: { directives?: readonly ConstDirectiveNode[] },
    /** if non-null, will add the inaccessible directive to the nodes directive if not already present. */
    includeInaccessibleDirective: boolean = false,
  ): readonly ConstDirectiveNode[] {
    let hasInaccessibleDirective = false;
    const directives =
      node.directives?.filter(directive => {
        if (directive.name.value === inaccessibleDirectiveName) {
          hasInaccessibleDirective = true;
        }
        return directive.name.value !== tagDirectiveName;
      }) ?? [];

    if (hasInaccessibleDirective === false && includeInaccessibleDirective) {
      directives.push({
        kind: Kind.DIRECTIVE,
        name: {
          kind: Kind.NAME,
          value: inaccessibleDirectiveName,
        },
      });
    }

    return directives;
  };
}

/** check whether two sets have an intersection with each other. */
function hasIntersection<T>(a: Set<T>, b: Set<T>): boolean {
  if (a.size === 0 || b.size === 0) {
    return false;
  }
  for (const item of a) {
    if (b.has(item)) {
      return true;
    }
  }
  return false;
}

function getRootTypeNamesFromDocumentNode(document: DocumentNode) {
  let queryName: string | null = 'Query';
  let mutationName: string | null = 'Mutation';
  let subscriptionName: string | null = 'Subscription';

  for (const definition of document.definitions) {
    if (definition.kind === Kind.SCHEMA_DEFINITION || definition.kind === Kind.SCHEMA_EXTENSION) {
      for (const operationTypeDefinition of definition.operationTypes ?? []) {
        if (operationTypeDefinition.operation === 'query') {
          queryName = operationTypeDefinition.type.name.value;
        }
        if (operationTypeDefinition.operation === 'mutation') {
          mutationName = operationTypeDefinition.type.name.value;
        }
        if (operationTypeDefinition.operation === 'subscription') {
          subscriptionName = operationTypeDefinition.type.name.value;
        }
      }
    }
  }

  const names = new Set<string>();

  names.add(queryName);
  names.add(mutationName);
  names.add(subscriptionName);

  return names;
}

type ObjectLikeNode =
  | ObjectTypeExtensionNode
  | ObjectTypeDefinitionNode
  | InterfaceTypeDefinitionNode
  | InterfaceTypeExtensionNode
  | InputObjectTypeDefinitionNode
  | InputObjectTypeExtensionNode;

/**
 * Takes a subgraph document node and a set of tag filters and transforms the document node to contain `@inaccessible` directives on all fields not included by the applied filter.
 * Note: you probably want to use `filterSubgraphs` instead, as it also applies the correct post step required after applying this.
 */
export function applyTagFilterToInaccessibleTransformOnSubgraphSchema(
  documentNode: DocumentNode,
  filter: Federation2SubgraphDocumentNodeByTagsFilter,
): {
  typeDefs: DocumentNode;
  /** Types within THIS subgraph where all fields are inaccessible */
  typesWithAllFieldsInaccessible: Map<string, boolean>;
  transformTagDirectives: ReturnType<typeof createTransformTagDirectives>;
  /** Types in this subgraph that have the inaccessible directive applied */
  typesWithInaccessibleApplied: Set<string>;
} {
  const { resolveImportName } = extractLinkImplementations(documentNode);
  const inaccessibleDirectiveName = resolveImportName(
    'https://specs.apollo.dev/federation',
    '@inaccessible',
  );
  const tagDirectiveName = resolveImportName('https://specs.apollo.dev/federation', '@tag');
  const getTagsOnNode = buildGetTagsOnNode(tagDirectiveName);
  const transformTagDirectives = createTransformTagDirectives(
    tagDirectiveName,
    inaccessibleDirectiveName,
  );
  const rootTypeNames = getRootTypeNamesFromDocumentNode(documentNode);

  const typesWithAllFieldsInaccessibleTracker = new Map<string, boolean>();

  function onAllFieldsInaccessible(name: string) {
    const current = typesWithAllFieldsInaccessibleTracker.get(name);
    if (current === undefined) {
      typesWithAllFieldsInaccessibleTracker.set(name, true);
    }
  }

  function onSomeFieldsAccessible(name: string) {
    typesWithAllFieldsInaccessibleTracker.set(name, false);
  }

  function fieldArgumentHandler(node: InputValueDefinitionNode) {
    const tagsOnNode = getTagsOnNode(node);
    if (
      (filter.include.size && !hasIntersection(tagsOnNode, filter.include)) ||
      (filter.exclude.size && hasIntersection(tagsOnNode, filter.exclude))
    ) {
      return {
        ...node,
        directives: transformTagDirectives(node, true),
      };
    }

    return {
      ...node,
      directives: transformTagDirectives(node),
    };
  }

  const definitionsBySchemaCoordinate = new Map<string, Array<ObjectLikeNode>>();

  //
  // A type can occur multiple times within a subgraph and we need to find all implementation of each type
  // in order to determine whether type full type, or only some fields are part a contract
  //
  for (const definition of documentNode.definitions) {
    switch (definition.kind) {
      case Kind.OBJECT_TYPE_DEFINITION:
      case Kind.OBJECT_TYPE_EXTENSION:
      case Kind.INTERFACE_TYPE_DEFINITION:
      case Kind.INTERFACE_TYPE_EXTENSION:
      case Kind.INPUT_OBJECT_TYPE_DEFINITION:
      case Kind.INPUT_OBJECT_TYPE_EXTENSION: {
        let items = definitionsBySchemaCoordinate.get(definition.name.value);
        if (!items) {
          items = [];
          definitionsBySchemaCoordinate.set(definition.name.value, items);
        }
        items.push(definition);
      }
    }
  }

  // Tracking for which type already has `@inaccessible` applied (can only occur once)
  const typesWithInaccessibleApplied = new Set<string>();
  // These are later used within the visitor to actually replace the nodes.
  const replacementTypeNodes = new Map<ObjectLikeNode, ObjectLikeNode>();

  for (const [typeName, nodes] of definitionsBySchemaCoordinate) {
    /** After processing all nodes implementing a type, we know whether all or only some fields are inaccessible */
    let isSomeFieldsAccessible = false;
    /** First node occurance record as stored within the `replacementTypeNodes` map.  */
    let firstReplacementTypeNodeRecord: {
      key: ObjectLikeNode;
      value: ObjectLikeNode;
    } | null = null;

    for (const node of nodes) {
      const tagsOnNode = getTagsOnNode(node);
      let newNode = {
        ...node,
        fields: node.fields?.map(node => {
          const tagsOnNode = getTagsOnNode(node);

          if (node.kind === Kind.FIELD_DEFINITION) {
            node = {
              ...node,
              arguments: node.arguments?.map(fieldArgumentHandler),
            } as FieldDefinitionNode;
          }

          if (
            (filter.include.size && !hasIntersection(tagsOnNode, filter.include)) ||
            (filter.exclude.size && hasIntersection(tagsOnNode, filter.exclude))
          ) {
            return {
              ...node,
              directives: transformTagDirectives(node, true),
            };
          }

          isSomeFieldsAccessible = true;

          return {
            ...node,
            directives: transformTagDirectives(node),
          };
        }),
      } as ObjectLikeNode;

      if (
        !rootTypeNames.has(node.name.value) &&
        filter.exclude.size &&
        hasIntersection(tagsOnNode, filter.exclude)
      ) {
        newNode = {
          ...newNode,
          directives: transformTagDirectives(
            node,
            typesWithInaccessibleApplied.has(typeName) ? false : true,
          ),
        } as ObjectLikeNode;
        typesWithInaccessibleApplied.add(typeName);
      } else {
        newNode = {
          ...newNode,
          directives: transformTagDirectives(node),
        };
      }

      if (!firstReplacementTypeNodeRecord) {
        firstReplacementTypeNodeRecord = {
          key: node,
          value: newNode,
        };
      }
      replacementTypeNodes.set(node, newNode);
    }

    // If some fields are accessible, we continue with the next type
    if (isSomeFieldsAccessible) {
      onSomeFieldsAccessible(typeName);
      continue;
    }

    onAllFieldsInaccessible(typeName);
    // If all fields are inaccessible we need to add the `@inaccessible` directive on the first definition of the type
    // BUT only if the type is not @inaccessible yet.
    if (typesWithInaccessibleApplied.has(typeName) === false && firstReplacementTypeNodeRecord) {
      replacementTypeNodes.set(firstReplacementTypeNodeRecord.key, {
        ...firstReplacementTypeNodeRecord.value,
        directives: transformTagDirectives(firstReplacementTypeNodeRecord.value, true),
      });
      typesWithInaccessibleApplied.add(typeName);
    }
  }

  function fieldLikeObjectHandler(node: ObjectLikeNode) {
    const newNode = replacementTypeNodes.get(node);
    if (!newNode) {
      throw new Error(
        `Found type without transformation mapping. ${node.name.value} ${node.name.kind}`,
      );
    }

    return newNode;
  }

  function enumHandler(node: EnumTypeDefinitionNode | EnumTypeExtensionNode) {
    const tagsOnNode = getTagsOnNode(node);

    let isAllFieldsInaccessible = true;

    const newNode = {
      ...node,
      values: node.values?.map(node => {
        const tagsOnNode = getTagsOnNode(node);

        if (
          (filter.include.size && !hasIntersection(tagsOnNode, filter.include)) ||
          (filter.exclude.size && hasIntersection(tagsOnNode, filter.exclude))
        ) {
          return {
            ...node,
            directives: transformTagDirectives(node, true),
          };
        }

        isAllFieldsInaccessible = false;

        return {
          ...node,
          directives: transformTagDirectives(node),
        };
      }),
    };

    if (filter.exclude.size && hasIntersection(tagsOnNode, filter.exclude)) {
      return {
        ...newNode,
        directives: transformTagDirectives(node, true),
      };
    }

    if (isAllFieldsInaccessible) {
      onAllFieldsInaccessible(node.name.value);
    } else {
      onSomeFieldsAccessible(node.name.value);
    }

    return {
      ...newNode,
      directives: transformTagDirectives(node),
    };
  }

  function scalarAndUnionHandler(node: ScalarTypeDefinitionNode | UnionTypeDefinitionNode) {
    const tagsOnNode = getTagsOnNode(node);

    if (
      (filter.include.size && !hasIntersection(tagsOnNode, filter.include)) ||
      (filter.exclude.size && hasIntersection(tagsOnNode, filter.exclude))
    ) {
      return {
        ...node,
        directives: transformTagDirectives(node, true),
      };
    }

    return {
      ...node,
      directives: transformTagDirectives(node),
    };
  }

  const typeDefs = visit(documentNode, {
    [Kind.OBJECT_TYPE_DEFINITION]: fieldLikeObjectHandler,
    [Kind.OBJECT_TYPE_EXTENSION]: fieldLikeObjectHandler,
    [Kind.INTERFACE_TYPE_DEFINITION]: fieldLikeObjectHandler,
    [Kind.INTERFACE_TYPE_EXTENSION]: fieldLikeObjectHandler,
    [Kind.INPUT_OBJECT_TYPE_DEFINITION]: fieldLikeObjectHandler,
    [Kind.INPUT_OBJECT_TYPE_EXTENSION]: fieldLikeObjectHandler,
    [Kind.ENUM_TYPE_DEFINITION]: enumHandler,
    [Kind.ENUM_TYPE_EXTENSION]: enumHandler,
    [Kind.SCALAR_TYPE_DEFINITION]: scalarAndUnionHandler,
    [Kind.UNION_TYPE_DEFINITION]: scalarAndUnionHandler,
  });

  for (const rootTypeName of rootTypeNames) {
    typesWithAllFieldsInaccessibleTracker.delete(rootTypeName);
  }

  return {
    typeDefs,
    typesWithAllFieldsInaccessible: typesWithAllFieldsInaccessibleTracker,
    transformTagDirectives,
    typesWithInaccessibleApplied,
  };
}

function makeTypesFromSetInaccessible(
  documentNode: DocumentNode,
  types: Set<string>,
  transformTagDirectives: ReturnType<typeof createTransformTagDirectives>,
) {
  function typeHandler(
    node:
      | ObjectTypeExtensionNode
      | ObjectTypeDefinitionNode
      | InterfaceTypeDefinitionNode
      | InterfaceTypeExtensionNode
      | InputObjectTypeDefinitionNode
      | InputObjectTypeExtensionNode
      | EnumTypeDefinitionNode
      | EnumTypeExtensionNode,
  ) {
    if (types.has(node.name.value) === false) {
      return;
    }
    return {
      ...node,
      directives: transformTagDirectives(node, true),
    };
  }

  return visit(documentNode, {
    [Kind.OBJECT_TYPE_DEFINITION]: typeHandler,
    [Kind.OBJECT_TYPE_EXTENSION]: typeHandler,
    [Kind.INTERFACE_TYPE_DEFINITION]: typeHandler,
    [Kind.INTERFACE_TYPE_EXTENSION]: typeHandler,
    [Kind.INPUT_OBJECT_TYPE_DEFINITION]: typeHandler,
    [Kind.INPUT_OBJECT_TYPE_EXTENSION]: typeHandler,
    [Kind.ENUM_TYPE_DEFINITION]: typeHandler,
    [Kind.ENUM_TYPE_EXTENSION]: typeHandler,
  });
}

/**
 * Apply a tag filter to a set of subgraphs.
 */
export function applyTagFilterOnSubgraphs<
  TType extends {
    typeDefs: DocumentNode;
    name: string;
  },
>(subgraphs: Array<TType>, filter: Federation2SubgraphDocumentNodeByTagsFilter): Array<TType> {
  let filteredSubgraphs = subgraphs.map(subgraph => {
    return {
      ...subgraph,
      ...applyTagFilterToInaccessibleTransformOnSubgraphSchema(subgraph.typeDefs, filter),
    };
  });

  const intersectionOfTypesWhereAllFieldsAreInaccessible = new Set<string>();
  // We need to traverse all subgraphs to find the intersection of types where all fields are inaccessible.
  // If a type is not present in any other subgraph, we can safely mark it as inaccessible.
  filteredSubgraphs.forEach(subgraph => {
    const otherSubgraphs = filteredSubgraphs.filter(sub => sub !== subgraph);

    for (const [type, allFieldsInaccessible] of subgraph.typesWithAllFieldsInaccessible) {
      if (
        allFieldsInaccessible &&
        otherSubgraphs.every(
          sub =>
            !sub.typesWithAllFieldsInaccessible.has(type) ||
            sub.typesWithAllFieldsInaccessible.get(type) === true,
        )
      ) {
        intersectionOfTypesWhereAllFieldsAreInaccessible.add(type);
      }
      // let's not visit this type a second time...
      otherSubgraphs.forEach(sub => {
        sub.typesWithAllFieldsInaccessible.delete(type);
      });
    }
  });

  if (!intersectionOfTypesWhereAllFieldsAreInaccessible.size) {
    return filteredSubgraphs;
  }

  return filteredSubgraphs.map(subgraph => ({
    ...subgraph,
    typeDefs: makeTypesFromSetInaccessible(
      subgraph.typeDefs,
      /** We exclude the types that are already marked as inaccessible within the subgraph as we want to avoid `@inaccessible` applied more than once. */
      difference(
        intersectionOfTypesWhereAllFieldsAreInaccessible,
        subgraph.typesWithInaccessibleApplied,
      ),
      subgraph.transformTagDirectives,
    ),
  }));
}

function difference<$Type>(set1: Set<$Type>, set2: Set<$Type>): Set<$Type> {
  const result = new Set<$Type>();
  set1.forEach(item => {
    if (!set2.has(item)) {
      result.add(item);
    }
  });
  return result;
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

/**
 * Extract all
 */

export type Federation2SubgraphDocumentNodeByTagsFilter = {
  include: Set<string>;
  exclude: Set<string>;
};

function buildGetTagsOnNode(directiveName: string) {
  const emptySet = new Set<string>();
  return function getTagsOnNode(node: { directives?: ReadonlyArray<DirectiveNode> }): Set<string> {
    if (!node.directives) {
      return emptySet;
    }
    const tags = new Set<string>();
    for (const directive of node.directives) {
      if (
        directive.name.value === directiveName &&
        directive.arguments?.[0].name.value === 'name' &&
        directive.arguments[0].value.kind === Kind.STRING
      ) {
        tags.add(directive.arguments[0].value.value);
      }
    }

    if (!tags.size) {
      return emptySet;
    }
    return tags;
  };
}
