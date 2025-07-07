import {
  ArgumentNode,
  DefinitionNode,
  DirectiveNode,
  DocumentNode,
  GraphQLSchema,
  Kind,
  OperationDefinitionNode,
  print,
  SelectionNode,
  separateOperations,
  stripIgnoredCharacters,
  TypeInfo,
  VariableDefinitionNode,
  visit,
} from 'graphql';
import { md5 } from 'js-md5';
import sortBy from 'lodash.sortby';
import { collectSchemaCoordinates } from '../client/collect-schema-coordinates.js';

/**
 * Normalize a operation document.
 */
export function normalizeOperation({
  document,
  operationName,
  hideLiterals = true,
  removeAliases = true,
}: {
  document: DocumentNode;
  hideLiterals?: boolean;
  removeAliases?: boolean;
  operationName?: string;
}): string {
  return stripIgnoredCharacters(
    print(
      visit(
        dropUnusedDefinitions(
          document,
          operationName ?? document.definitions.find(isOperationDef)?.name?.value,
        ),
        {
          // hide literals
          IntValue(node) {
            return hideLiterals ? { ...node, value: '0' } : node;
          },
          FloatValue(node) {
            return hideLiterals ? { ...node, value: '0' } : node;
          },
          StringValue(node) {
            return hideLiterals ? { ...node, value: '', block: false } : node;
          },
          Field(node) {
            return {
              ...node,
              // remove aliases
              alias: removeAliases ? undefined : node.alias,
              // sort arguments
              arguments: sortNodes(node.arguments),
            };
          },
          Document(node) {
            return {
              ...node,
              definitions: sortNodes(node.definitions),
            };
          },
          OperationDefinition(node) {
            return {
              ...node,
              variableDefinitions: sortNodes(node.variableDefinitions),
            };
          },
          SelectionSet(node) {
            return {
              ...node,
              selections: sortNodes(node.selections),
            };
          },
          FragmentSpread(node) {
            return {
              ...node,
              directives: sortNodes(node.directives),
            };
          },
          InlineFragment(node) {
            return {
              ...node,
              directives: sortNodes(node.directives),
            };
          },
          FragmentDefinition(node) {
            return {
              ...node,
              directives: sortNodes(node.directives),
              variableDefinitions: sortNodes(node.variableDefinitions),
            };
          },
          Directive(node) {
            return { ...node, arguments: sortNodes(node.arguments) };
          },
        },
      ),
    ),
  );
}

function sortNodes(nodes: readonly DefinitionNode[]): readonly DefinitionNode[];
function sortNodes(nodes: readonly SelectionNode[]): readonly SelectionNode[];
function sortNodes(nodes: readonly ArgumentNode[] | undefined): readonly ArgumentNode[] | undefined;
function sortNodes(
  nodes: readonly VariableDefinitionNode[] | undefined,
): readonly VariableDefinitionNode[] | undefined;
function sortNodes(
  nodes: readonly DirectiveNode[] | undefined,
): readonly DirectiveNode[] | undefined;
function sortNodes(nodes: readonly any[] | undefined): readonly any[] | undefined {
  if (nodes) {
    if (nodes.length === 0) {
      return [];
    }

    if (isOfKindList<DirectiveNode>(nodes, Kind.DIRECTIVE)) {
      return sortBy(nodes, 'name.value');
    }

    if (isOfKindList<VariableDefinitionNode>(nodes, Kind.VARIABLE_DEFINITION)) {
      return sortBy(nodes, 'variable.name.value');
    }

    if (isOfKindList<ArgumentNode>(nodes, Kind.ARGUMENT)) {
      return sortBy(nodes, 'name.value');
    }

    if (
      isOfKindList<SelectionNode>(nodes, [Kind.FIELD, Kind.FRAGMENT_SPREAD, Kind.INLINE_FRAGMENT])
    ) {
      return sortBy(nodes, 'kind', 'name.value');
    }

    return sortBy(nodes, 'kind', 'name.value');
  }

  return;
}

function isOfKindList<T>(nodes: readonly any[], kind: string | string[]): nodes is T[] {
  return typeof kind === 'string' ? nodes[0].kind === kind : kind.includes(nodes[0].kind);
}

function isOperationDef(def: DefinitionNode): def is OperationDefinitionNode {
  return def.kind === Kind.OPERATION_DEFINITION;
}

function dropUnusedDefinitions(doc: DocumentNode, operationName?: string) {
  if (!operationName) {
    return doc;
  }

  return separateOperations(doc)[operationName] ?? doc;
}

function findOperationDefinition(doc: DocumentNode) {
  return doc.definitions.find(isOperationDef);
}

/** normalize a graphql operation into a stable hash as used internally within our ClickHouse Database. */
export function preprocessOperation(operation: {
  document: DocumentNode;
  schemaCoordinates: Iterable<string>;
  operationName: string | null;
}) {
  const body = normalizeOperation({
    document: operation.document,
    hideLiterals: true,
    removeAliases: true,
  });

  // Two operations with the same hash has to be equal:
  // 1. body is the same
  // 2. name is the same
  // 3. used schema coordinates are equal - this is important to assign schema coordinate to an operation

  const uniqueCoordinatesSet = new Set<string>();
  for (const field of operation.schemaCoordinates) {
    uniqueCoordinatesSet.add(field);
    // Add types as well:
    // `Query.foo` -> `Query`
    const at = field.indexOf('.');
    if (at > -1) {
      uniqueCoordinatesSet.add(field.substring(0, at));
    }
  }

  const sortedCoordinates = Array.from(uniqueCoordinatesSet).sort();

  const operationDefinition = findOperationDefinition(operation.document);

  if (!operationDefinition) {
    return null;
  }

  const operationName = operation.operationName ?? operationDefinition.name?.value;

  const hash = md5
    .create()
    .update(body)
    .update(operationName ?? '')
    .update(sortedCoordinates.join(';')) // we do not need to sort from A to Z, default lexicographic sorting is enough
    .hex();

  return {
    type: operationDefinition.operation,
    hash,
    body,
    coordinates: sortedCoordinates,
    name: operationName || null,
  };
}

/**
 * Hash a executable GraphQL document according to Hive platforms algorithm
 * for identification.
 *
 * Return null if no executable operation definition was found.
 */
export function hashOperation(args: {
  documentNode: DocumentNode;
  variables: null | {
    [key: string]: unknown;
  };
  operationName: string | null;
  schema: GraphQLSchema;
  typeInfo?: TypeInfo;
}) {
  const schemaCoordinates = collectSchemaCoordinates({
    documentNode: args.documentNode,
    processVariables: args.variables !== null,
    variables: args.variables ?? {},
    schema: args.schema,
    typeInfo: args.typeInfo ?? new TypeInfo(args.schema),
  });

  const result = preprocessOperation({
    document: args.documentNode,
    schemaCoordinates: schemaCoordinates,
    operationName: args.operationName,
  });

  return result?.hash ?? null;
}
