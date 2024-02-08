import {
  EnumTypeExtensionNode,
  InputObjectTypeExtensionNode,
  InterfaceTypeExtensionNode,
  Kind,
  ObjectTypeExtensionNode,
  visit,
  type ArgumentNode,
  type ConstDirectiveNode,
  type DirectiveNode,
  type DocumentNode,
  type EnumTypeDefinitionNode,
  type FieldDefinitionNode,
  type InputObjectTypeDefinitionNode,
  type InputValueDefinitionNode,
  type InterfaceTypeDefinitionNode,
  type ObjectFieldNode,
  type ObjectTypeDefinitionNode,
  type ScalarTypeDefinitionNode,
  type UnionTypeDefinitionNode,
} from 'graphql';

type TagExtractionStrategy = (directiveNode: DirectiveNode) => string | null;

const federationSubgraphSpecificationUrl = 'https://specs.apollo.dev/federation/';

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

/**
 * Retrieve both the url and import argument from an `@link` directive AST node.
 * @link https://specs.apollo.dev/link/v1.0/#@link
 **/
function getUrlAndImportDirectiveArgumentsFromLinkDirectiveNode(directiveNode: DirectiveNode): {
  url: ArgumentNode | null;
  import: ArgumentNode | null;
} {
  let urlArgument: ArgumentNode | null = null;
  let importArgument: ArgumentNode | null = null;

  if (directiveNode.arguments) {
    for (const argument of directiveNode.arguments) {
      if (argument.name.value === 'url') {
        urlArgument = argument;
      }
      if (argument.name.value === 'import') {
        importArgument = argument;
      }
    }
  }

  return {
    url: urlArgument,
    import: importArgument,
  };
}

/**
 * Resolve the actual directive name from an ObjectValueNode, that has been passed to a `@link` directive import argument.
 * @link https://specs.apollo.dev/link/v1.0/#Import
 */
function resolveImportedDirectiveNameFromObjectFieldNodes(
  forName: string,
  objectFieldNodes: ReadonlyArray<ObjectFieldNode>,
) {
  let alias: string | null = null;
  let name: string | null = null;

  for (const field of objectFieldNodes) {
    if (field.name.value === 'name' && field.value.kind === Kind.STRING) {
      name = field.value.value;
      if (name !== forName) {
        return null;
      }
    }
    if (field.name.value === 'as' && field.value.kind === Kind.STRING) {
      alias = field.value.value;
    }
  }

  const final = alias ?? name;

  if (final && final[0] === '@') {
    return final.substring(1);
  }

  return null;
}

/**
 * Helper function for creating a function that resolves the federation directive name within the subgraph.
 */
function createGetFederationDirectiveNameForSubgraphSDL(directiveName: string) {
  const prefixedName = `federation__${directiveName}`;
  const defaultName = directiveName;
  const importName = `@${directiveName}`;

  return function getFederationTagDirectiveNameForSubgraphSDL(documentNode: DocumentNode): string {
    for (const definition of documentNode.definitions) {
      if (
        (definition.kind !== Kind.SCHEMA_DEFINITION && definition.kind !== Kind.SCHEMA_EXTENSION) ||
        !definition.directives
      ) {
        continue;
      }

      for (const directive of definition.directives) {
        const args = getUrlAndImportDirectiveArgumentsFromLinkDirectiveNode(directive);
        if (
          args.url?.value.kind === Kind.STRING &&
          args.url.value.value.startsWith(federationSubgraphSpecificationUrl)
        ) {
          if (!args.import || args.import.value.kind !== Kind.LIST) {
            return prefixedName;
          }

          for (const item of args.import.value.values) {
            if (item.kind === Kind.STRING && item.value === importName) {
              return defaultName;
            }

            if (item.kind === Kind.OBJECT && item.fields) {
              const resolvedDirectiveName = resolveImportedDirectiveNameFromObjectFieldNodes(
                importName,
                item.fields,
              );
              if (resolvedDirectiveName) {
                return resolvedDirectiveName;
              }
            }
          }
          return prefixedName;
        }
      }
    }

    // no directives? this must be Federation 1.X
    return defaultName;
  };
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

/** Retrieve the actual `@tag` directive name from a given subgraph */
export const getFederationTagDirectiveNameForSubgraphSDL =
  createGetFederationDirectiveNameForSubgraphSDL('tag');
/** Retrieve the actual `@inaccessible` directive name from a given subgraph */
const getFederationInaccessibleDirectiveNameForSubgraphSDL =
  createGetFederationDirectiveNameForSubgraphSDL('inaccessible');

/**
 * Takes a subgraph document node and a set of tag filters and transforms the document node to contain `@inaccessible` directives on all fields not included by the applied filter.
 * Note: you probably want to use `filterSubgraphs` instead, as it also applies the correct post step required after applying this.
 */
export function applyTagFilterToInaccessibleTransformOnSubgraphSchema(
  documentNode: DocumentNode,
  filter: Federation2SubgraphDocumentNodeByTagsFilter,
): {
  typeDefs: DocumentNode;
  typesWithAllFieldsInaccessible: Map<string, boolean>;
  transformTagDirectives: ReturnType<typeof createTransformTagDirectives>;
} {
  const tagDirectiveName = getFederationTagDirectiveNameForSubgraphSDL(documentNode);
  const inaccessibleDirectiveName =
    getFederationInaccessibleDirectiveNameForSubgraphSDL(documentNode);
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
      (filter.include && !hasIntersection(tagsOnNode, filter.include)) ||
      (filter.exclude && hasIntersection(tagsOnNode, filter.exclude))
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
          (filter.include && !hasIntersection(tagsOnNode, filter.include)) ||
          (filter.exclude && hasIntersection(tagsOnNode, filter.exclude))
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
      filter.exclude &&
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
          (filter.include && !hasIntersection(tagsOnNode, filter.include)) ||
          (filter.exclude && hasIntersection(tagsOnNode, filter.exclude))
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

    if (filter.exclude && hasIntersection(tagsOnNode, filter.exclude)) {
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
      (filter.include && !hasIntersection(tagsOnNode, filter.include)) ||
      (filter.exclude && hasIntersection(tagsOnNode, filter.exclude))
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
  const filteredSubgraphs = subgraphs.map(subgraph => ({
    ...subgraph,
    ...applyTagFilterToInaccessibleTransformOnSubgraphSchema(subgraph.typeDefs, filter),
  }));

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
    filteredSubgraphs;
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

function createFederationDirectiveStrategy(directiveName: string): TagExtractionStrategy {
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

export const getTagDirectiveNameFromFederation2SupergraphSDL =
  createGetImportedDirectiveNameFromFederation2SupergraphSDL(
    'https://specs.apollo.dev/tag/',
    'tag',
  );

export const getInaccessibleDirectiveNameFromFederation2SupergraphSDL =
  createGetImportedDirectiveNameFromFederation2SupergraphSDL(
    'https://specs.apollo.dev/inaccessible/',
    'inaccessible',
  );

/**
 * Extract all
 */
export function extractTagsFromFederation2SupergraphSDL(documentNode: DocumentNode) {
  const federationDirectiveName = getTagDirectiveNameFromFederation2SupergraphSDL(documentNode);

  if (federationDirectiveName === null) {
    return null;
  }

  const tagStrategy = createFederationDirectiveStrategy(federationDirectiveName);

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
}

export type Federation2SubgraphDocumentNodeByTagsFilter = {
  include: Set<string> | null;
  exclude: Set<string> | null;
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
