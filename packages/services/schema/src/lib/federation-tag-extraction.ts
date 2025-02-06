import {
  EnumTypeExtensionNode,
  InputObjectTypeExtensionNode,
  InterfaceTypeExtensionNode,
  Kind,
  ObjectTypeExtensionNode,
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
import {
  detectLinkedImplementations,
  FEDERATION_V1,
  LinkableSpec,
} from '@graphql-hive/federation-link-utils';

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

/**
 * Takes a subgraph document node and a set of tag filters and transforms the document node to contain `@inaccessible` directives on all fields not included by the applied filter.
 * Note: you probably want to use `filterSubgraphs` instead, as it also applies the correct post step required after applying this.
 */
export function applyTagFilterToInaccessibleTransformOnSubgraphSchema(
  documentNode: DocumentNode,
  filter: Federation2SubgraphDocumentNodeByTagsFilter,
  inaccessibleDirectiveName: string,
  tagDirectiveName: string,
): {
  typeDefs: DocumentNode;
  typesWithAllFieldsInaccessible: Map<string, boolean>;
  transformTagDirectives: ReturnType<typeof createTransformTagDirectives>;
} {
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

  function fieldLikeObjectHandler(
    node:
      | ObjectTypeExtensionNode
      | ObjectTypeDefinitionNode
      | InterfaceTypeDefinitionNode
      | InterfaceTypeExtensionNode
      | InputObjectTypeDefinitionNode
      | InputObjectTypeExtensionNode,
  ) {
    const tagsOnNode = getTagsOnNode(node);

    let isAllFieldsInaccessible = true;

    const newNode = {
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

        isAllFieldsInaccessible = false;

        return {
          ...node,
          directives: transformTagDirectives(node),
        };
      }),
    };

    if (
      !rootTypeNames.has(node.name.value) &&
      filter.exclude.size &&
      hasIntersection(tagsOnNode, filter.exclude)
    ) {
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
  const specImpl = (resolveName: (name: string) => string) => (subgraph: TType) => {
    const inaccessibleName = resolveName('@inaccessible');
    const tagName = resolveName('@tag');
    const filteredSubgraph = {
      ...subgraph,
      ...applyTagFilterToInaccessibleTransformOnSubgraphSchema(
        subgraph.typeDefs,
        filter,
        inaccessibleName,
        tagName,
      ),
    };
    return filteredSubgraph;
  };

  // for every subgraph, get the spec and apply it.
  // Current behavior is to treat fed1 and fed2 the same and support all versions.
  const federationTagFilterSpec = new LinkableSpec('https://specs.apollo.dev/federation', {
    [FEDERATION_V1]: specImpl,
    v1_1: specImpl,
    v2_9: specImpl,
  });

  let filteredSubgraphs = subgraphs.map(subgraph => {
    const implementations = detectLinkedImplementations(subgraph.typeDefs, [
      federationTagFilterSpec,
    ]);
    // @note if more specs are defined, then loop.
    // but right now we know there is always one.
    if (implementations[0]) {
      return implementations[0](subgraph);
    }
    return {
      ...subgraph,
      typesWithAllFieldsInaccessible: new Map<string, boolean>(),
      transformTagDirectives: () => [],
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
      intersectionOfTypesWhereAllFieldsAreInaccessible,
      subgraph.transformTagDirectives,
    ),
  }));
}

export function createFederationDirectiveStrategy(directiveName: string): TagExtractionStrategy {
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

function createGetImportedDirectiveNameFromFederation2SupergraphSDL(
  directiveImportUrlPrefix: string,
  defaultName: string,
) {
  return function getDirectiveNameFromFederation2SupergraphSDL(
    documentNode: DocumentNode,
  ): string | null {
    for (const definition of documentNode.definitions) {
      if (
        (definition.kind !== Kind.SCHEMA_DEFINITION && definition.kind !== Kind.SCHEMA_EXTENSION) ||
        !definition.directives
      ) {
        continue;
      }

      for (const directive of definition.directives) {
        // TODO: maybe not rely on argument order - but the order seems stable
        if (
          directive.name.value === 'link' &&
          directive.arguments?.[0].name.value === 'url' &&
          directive.arguments[0].value.kind === Kind.STRING &&
          directive.arguments[0].value.value.startsWith(directiveImportUrlPrefix)
        ) {
          if (
            directive.arguments[1]?.name.value === 'as' &&
            directive.arguments[1].value.kind === Kind.STRING
          ) {
            return directive.arguments[1].value.value;
          }
          return defaultName;
        }
      }
      return null;
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
