import { createHash } from 'node:crypto';
import {
  buildASTSchema as buildASTSchemaGraphQL,
  ConstDirectiveNode,
  DefinitionNode,
  DocumentNode,
  EnumValueDefinitionNode,
  FieldDefinitionNode,
  GraphQLDirective,
  GraphQLSchema,
  InputValueDefinitionNode,
  isTypeSystemExtensionNode,
  Kind,
  lexicographicSortSchema,
  NamedTypeNode,
  OperationTypeDefinitionNode,
  parse,
  Source,
  visit,
} from 'graphql';
import lodash from 'lodash';
import { traceInlineSync } from '@hive/service-common';
import type { SchemaObject } from './entities';

export function hashSchema(schema: SchemaObject): string {
  return createHash('md5')
    .update(schema.source, 'utf-8')
    .update(`service_name: ${schema.source}`)
    .update(`service_url: ${schema.url || ''}`)
    .digest('hex');
}

/**
 * Builds GraphQLSchema without validation of SDL and sorts it
 */
export const buildSortedSchemaFromSchemaObject = traceInlineSync(
  'lexicographicSortSchema',
  {},
  (
    schema: Pick<SchemaObject, 'document'>,
    transformError = (error: unknown) => error,
  ): GraphQLSchema => {
    try {
      return buildLexicographicallySortedSchema(schema.document);
    } catch (error) {
      throw transformError(error);
    }
  },
);

/**
 * Equivalent to `lexicographicSortSchema(buildASTSchema(document))`: types, directives, fields, arguments,
 * input fields, enum values, interfaces, union members and directive locations end up in the same order.
 *
 * `lexicographicSortSchema` re-creates every type of an already built schema, which costs about as much as building it.
 * Instead, the lists inside the AST are sorted before building the schema once,
 * and the (unchanged) types and directives are then passed to a new GraphQLSchema in sorted order.
 *
 * The equivalence is covered by `__tests__/schema.spec.ts`.
 */
export function buildLexicographicallySortedSchema(document: DocumentNode): GraphQLSchema {
  // Fields of type extensions are appended to the fields of the extended type when building the schema,
  // so sorting the AST would not produce a sorted result. Extensions only appear in SDL of individual services.
  if (document.definitions.some(isTypeSystemExtensionNode)) {
    return lexicographicSortSchema(buildASTSchema(document));
  }

  const config = buildASTSchema(sortDocumentListsForSchema(document)).toConfig();

  // The type map follows the order of the types list.
  // This also sorts the built-in scalars and introspection types, as `lexicographicSortSchema` does.
  // Directives are re-created with sorted arguments and locations, including the built-in ones (e.g. @deprecated),
  // as `lexicographicSortSchema` does. There are only a few of them.
  return new GraphQLSchema({
    ...config,
    types: sortBy(config.types, type => type.name),
    directives: sortBy(config.directives, directive => directive.name).map(directive => {
      const directiveConfig = directive.toConfig();
      return new GraphQLDirective({
        ...directiveConfig,
        locations: sortBy(directiveConfig.locations, location => location),
        args: Object.fromEntries(
          Object.keys(directiveConfig.args)
            .sort(naturalCompare)
            .map(name => [name, directiveConfig.args[name]]),
        ),
      });
    }),
  });
}

function sortDocumentListsForSchema(document: DocumentNode): DocumentNode {
  return {
    ...document,
    definitions: document.definitions.map(definition => {
      switch (definition.kind) {
        case Kind.OBJECT_TYPE_DEFINITION:
        case Kind.INTERFACE_TYPE_DEFINITION:
          return {
            ...definition,
            interfaces: sortByNodeName(definition.interfaces),
            fields: sortByNodeName(definition.fields)?.map(field =>
              field.arguments && field.arguments.length > 1
                ? { ...field, arguments: sortByNodeName(field.arguments) }
                : field,
            ),
          };
        case Kind.INPUT_OBJECT_TYPE_DEFINITION:
          return { ...definition, fields: sortByNodeName(definition.fields) };
        case Kind.ENUM_TYPE_DEFINITION:
          return { ...definition, values: sortByNodeName(definition.values) };
        case Kind.UNION_TYPE_DEFINITION:
          return { ...definition, types: sortByNodeName(definition.types) };
        default:
          return definition;
      }
    }),
  };
}

function sortByNodeName<T extends { readonly name: { readonly value: string } }>(
  nodes: ReadonlyArray<T> | undefined,
): ReadonlyArray<T> | undefined {
  return nodes && nodes.length > 1 ? sortBy(nodes, node => node.name.value) : nodes;
}

/** Stable sort, using the same comparison as `lexicographicSortSchema`. */
function sortBy<T>(items: ReadonlyArray<T>, toKey: (item: T) => string): Array<T> {
  return items.slice().sort((a, b) => naturalCompare(toKey(a), toKey(b)));
}

/**
 * Copy of graphql-js' internal `naturalCompare` (used by `lexicographicSortSchema`),
 * which compares sequences of digits by their numeric value, e.g. `Type2` < `Type10`.
 */
function naturalCompare(aStr: string, bStr: string): number {
  let aIndex = 0;
  let bIndex = 0;

  while (aIndex < aStr.length && bIndex < bStr.length) {
    let aChar = aStr.charCodeAt(aIndex);
    let bChar = bStr.charCodeAt(bIndex);

    if (isDigit(aChar) && isDigit(bChar)) {
      let aNum = 0;
      do {
        ++aIndex;
        aNum = aNum * 10 + aChar - DIGIT_0;
        aChar = aStr.charCodeAt(aIndex);
      } while (isDigit(aChar) && aNum > 0);

      let bNum = 0;
      do {
        ++bIndex;
        bNum = bNum * 10 + bChar - DIGIT_0;
        bChar = bStr.charCodeAt(bIndex);
      } while (isDigit(bChar) && bNum > 0);

      if (aNum < bNum) {
        return -1;
      }

      if (aNum > bNum) {
        return 1;
      }
    } else {
      if (aChar < bChar) {
        return -1;
      }
      if (aChar > bChar) {
        return 1;
      }
      ++aIndex;
      ++bIndex;
    }
  }

  return aStr.length - bStr.length;
}

const DIGIT_0 = 48;
const DIGIT_9 = 57;

function isDigit(code: number): boolean {
  return !Number.isNaN(code) && DIGIT_0 <= code && code <= DIGIT_9;
}

/**
 * Builds GraphQLSchema without validation of SDL
 */
export const buildASTSchema = traceInlineSync(
  'buildASTSchema',
  {},
  (schema: DocumentNode, transformError = (error: unknown) => error): GraphQLSchema => {
    try {
      return buildASTSchemaGraphQL(schema, {
        assumeValid: true,
        assumeValidSDL: true,
      });
    } catch (error) {
      throw transformError(error);
    }
  },
);

/**
 * It's a wrapper around `graphql.parse` that records an OpenTelemetry span. It helps us measure performance.
 * @param source GraphQL source
 * @param context Context of the operation, e.g. `parse supergraphSDL in Query.explorer`
 * @returns
 */
export const parseGraphQLSource = traceInlineSync(
  (_source, context) => `parseGraphQLSource: ${context}`,
  {},
  (source: string | Source, _context: string) => {
    return parse(source, {
      noLocation: true,
    });
  },
);

export function createConnection<TInput>(): {
  nodes(nodes: readonly TInput[]): readonly TInput[];
  total(nodes: readonly TInput[]): number;
};
export function createConnection<TInput, TOutput = TInput>(
  map: (node: TInput) => TOutput,
): {
  nodes(nodes: readonly TInput[]): readonly TOutput[];
  total(nodes: readonly TInput[]): number;
};
export function createConnection(map?: (node: unknown) => unknown): {
  nodes(nodes: readonly unknown[]): readonly unknown[];
  total(nodes: readonly unknown[]): number;
} {
  return {
    nodes(nodes: readonly unknown[]): readonly unknown[] {
      if (map) {
        return nodes.map(map);
      }
      return nodes ?? [];
    },
    total(nodes: readonly unknown[]) {
      return nodes?.length ?? 0;
    },
  };
}

export function createDummyConnection<TInput>(): {
  edges(nodes: readonly TInput[]): readonly {
    node: TInput;
    cursor: string;
  }[];
  pageInfo(nodes: readonly TInput[]): {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor: string;
    endCursor: string;
  };
};
export function createDummyConnection<TInput, TOutput = TInput>(
  map: (node: TInput) => TOutput,
): {
  edges(nodes: readonly TInput[]): readonly {
    node: TOutput;
    cursor: string;
  }[];
  pageInfo(nodes: readonly TInput[]): {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor: string;
    endCursor: string;
  };
};
/**
 * Creates a dummy connection for an array value.
 */
export function createDummyConnection(map?: (node: unknown) => unknown): {
  edges(nodes: readonly unknown[]): readonly {
    node: unknown;
    cursor: string;
  }[];
  pageInfo(nodes: readonly unknown[]): {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor: string;
    endCursor: string;
  };
} {
  return {
    edges(nodes: readonly unknown[]): readonly {
      node: unknown;
      cursor: string;
    }[] {
      return nodes.map((node, index) => {
        return {
          node: map ? map(node) : node,
          cursor: String(index),
        };
      });
    },
    pageInfo() {
      return {
        hasNextPage: false,
        hasPreviousPage: false,
        startCursor: '',
        endCursor: '',
      };
    },
  };
}

export function sortDocumentNode(doc: DocumentNode): DocumentNode {
  return visit(doc, {
    Document(node) {
      return {
        ...node,
        definitions: sortNodes(node.definitions),
      };
    },
    SchemaDefinition(node) {
      return {
        ...node,
        directives: sortNodes(node.directives),
        operationTypes: sortNodes(node.operationTypes),
      };
    },
    SchemaExtension(node) {
      return {
        ...node,
        directives: sortNodes(node.directives),
        operationTypes: sortNodes(node.operationTypes),
      };
    },
    ScalarTypeDefinition(node) {
      return {
        ...node,
        directives: sortNodes(node.directives),
      };
    },
    ScalarTypeExtension(node) {
      return {
        ...node,
        directives: sortNodes(node.directives),
      };
    },
    ObjectTypeDefinition(node) {
      return {
        ...node,
        directives: sortNodes(node.directives),
        fields: sortNodes(node.fields),
        interfaces: sortNodes(node.interfaces),
      };
    },
    ObjectTypeExtension(node) {
      return {
        ...node,
        directives: sortNodes(node.directives),
        fields: sortNodes(node.fields),
        interfaces: sortNodes(node.interfaces),
      };
    },
    InterfaceTypeDefinition(node) {
      return {
        ...node,
        directives: sortNodes(node.directives),
        fields: sortNodes(node.fields),
        interfaces: sortNodes(node.interfaces),
      };
    },
    InterfaceTypeExtension(node) {
      return {
        ...node,
        directives: sortNodes(node.directives),
        fields: sortNodes(node.fields),
        interfaces: sortNodes(node.interfaces),
      };
    },
    UnionTypeDefinition(node) {
      return {
        ...node,
        directives: sortNodes(node.directives),
        types: sortNodes(node.types),
      };
    },
    UnionTypeExtension(node) {
      return {
        ...node,
        directives: sortNodes(node.directives),
        types: sortNodes(node.types),
      };
    },
    EnumTypeDefinition(node) {
      return {
        ...node,
        directives: sortNodes(node.directives),
        values: sortNodes(node.values),
      };
    },
    EnumTypeExtension(node) {
      return {
        ...node,
        directives: sortNodes(node.directives),
        values: sortNodes(node.values),
      };
    },
    InputObjectTypeDefinition(node) {
      return {
        ...node,
        directives: sortNodes(node.directives),
        fields: sortNodes(node.fields),
      };
    },
    InputObjectTypeExtension(node) {
      return {
        ...node,
        directives: sortNodes(node.directives),
        fields: sortNodes(node.fields),
      };
    },
    DirectiveDefinition(node) {
      return {
        ...node,
        arguments: sortNodes(node.arguments),
      };
    },
    FieldDefinition(node) {
      return {
        ...node,
        arguments: sortNodes(node.arguments),
        directives: sortNodes(node.directives),
      };
    },
    InputValueDefinition(node) {
      return {
        ...node,
        directives: sortNodes(node.directives),
      };
    },
    EnumValueDefinition(node) {
      return {
        ...node,
        directives: sortNodes(node.directives),
      };
    },
  });
}

function sortNodes(nodes: readonly DefinitionNode[]): readonly DefinitionNode[];
function sortNodes(
  nodes: readonly ConstDirectiveNode[] | undefined,
): readonly ConstDirectiveNode[] | undefined;
function sortNodes(
  nodes: readonly OperationTypeDefinitionNode[] | undefined,
): readonly OperationTypeDefinitionNode[] | undefined;
function sortNodes(
  nodes: readonly FieldDefinitionNode[] | undefined,
): readonly FieldDefinitionNode[] | undefined;
function sortNodes(
  nodes: readonly NamedTypeNode[] | undefined,
): readonly NamedTypeNode[] | undefined;
function sortNodes(
  nodes: readonly EnumValueDefinitionNode[] | undefined,
): readonly EnumValueDefinitionNode[] | undefined;
function sortNodes(
  nodes: readonly InputValueDefinitionNode[] | undefined,
): readonly InputValueDefinitionNode[] | undefined;
function sortNodes(nodes: readonly any[] | undefined): readonly any[] | undefined {
  if (nodes) {
    if (nodes.length === 0) {
      return [];
    }

    if (isOfKindList<OperationTypeDefinitionNode>(nodes, Kind.OPERATION_TYPE_DEFINITION)) {
      return lodash.sortBy(nodes, 'operation');
    }

    return lodash.sortBy(nodes, 'kind', 'name.value');
  }

  return;
}

function isOfKindList<T>(nodes: readonly any[], kind: string | string[]): nodes is T[] {
  return typeof kind === 'string' ? nodes[0].kind === kind : kind.includes(nodes[0].kind);
}
