import {
  GraphQLEnumType,
  GraphQLInterfaceType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLScalarType,
  GraphQLSchema,
  GraphQLUnionType,
  Kind,
  OperationTypeNode,
  parse,
  print,
  visit,
  type DefinitionNode,
  type DocumentNode,
  type FieldNode,
  type GraphQLField,
  type GraphQLNamedType,
  type GraphQLOutputType,
  type GraphQLType,
  type OperationDefinitionNode,
  type SelectionNode,
  type VariableDefinitionNode,
} from 'graphql';
import type { Maybe } from 'graphql/jsutils/Maybe';
import { get } from 'lodash';
import type { LaboratoryOperation } from './operations';

export function healQuery(query: string) {
  return query.replace(/\{(\s+)?\}/g, '');
}

export function isPathInQuery(query: string, path: string, operationName?: string) {
  if (!query || !path) {
    return false;
  }

  query = healQuery(query);

  const [operation, ...segments] = path.split('.') as [OperationTypeNode, ...string[]];

  let doc: DocumentNode | undefined;

  try {
    doc = parse(query);
  } catch {
    // console.error(error);
  }

  if (!doc) {
    return false;
  }

  const operationDefinition: OperationDefinitionNode = doc.definitions.find(v => {
    if (v.kind === Kind.OPERATION_DEFINITION && v.operation === operation) {
      if (operationName) {
        return v.name?.value === operationName;
      }

      return true;
    }

    return false;
  }) as OperationDefinitionNode;

  if (!operationDefinition) {
    return false;
  }

  if (segments.length === 0) {
    return true;
  }

  const currentPath: string[] = [];

  let found = false;

  visit(operationDefinition, {
    Field: {
      enter(field) {
        currentPath.push(field.name.value);

        if (
          currentPath.length === segments.length &&
          currentPath.every((v, i) => v === segments[i])
        ) {
          found = true;
          return false;
        }
      },
      leave() {
        currentPath.pop();
      },
    },
  });

  return found;
}

export function addPathToQuery(query: string, path: string, operationName?: string) {
  query = healQuery(query);

  const [operation, ...parts] = path.split('.') as [OperationTypeNode, ...string[]];

  let doc: DocumentNode | undefined;

  try {
    doc = parse(query);
  } catch {
    // console.error(error);
  }

  doc ??= {
    kind: Kind.DOCUMENT,
    definitions: [
      {
        kind: Kind.OPERATION_DEFINITION,
        operation,
        name: {
          kind: Kind.NAME,
          value: 'Untitled',
        },
        selectionSet: {
          kind: Kind.SELECTION_SET,
          selections: [],
        },
      },
    ],
  };

  let operationDefinition: OperationDefinitionNode = doc.definitions.find(v => {
    if (v.kind === Kind.OPERATION_DEFINITION && v.operation === operation) {
      if (operationName) {
        return v.name?.value === operationName;
      }

      return true;
    }

    return false;
  }) as OperationDefinitionNode;

  if (!operationDefinition) {
    operationDefinition = {
      kind: Kind.OPERATION_DEFINITION,
      operation,
      name: {
        kind: Kind.NAME,
        value: 'Untitled',
      },
      selectionSet: {
        kind: Kind.SELECTION_SET,
        selections: [],
      },
    };

    (doc.definitions as DefinitionNode[]).push(operationDefinition);
  }

  if (parts.length === 0) {
    return print(doc)
      .split('\n')
      .map(v => {
        if (v.includes(`${operation} Untitled`)) {
          return v + ' {}';
        }

        return v;
      })
      .join('\n');
  }

  const currentPath: string[] = [];

  visit(operationDefinition, {
    OperationDefinition: {
      enter(operationDefinition) {
        const fieldName = parts[0];

        // @ts-expect-error temp
        operationDefinition.selectionSet ??= {
          kind: Kind.SELECTION_SET,
          selections: [],
        };

        let fieldNode: FieldNode = operationDefinition.selectionSet.selections.find(v => {
          return v.kind === Kind.FIELD && v.name.value === fieldName;
        }) as FieldNode;

        if (!fieldNode) {
          fieldNode = {
            kind: Kind.FIELD,
            name: {
              kind: Kind.NAME,
              value: fieldName,
            },
          };

          (operationDefinition.selectionSet.selections as SelectionNode[]).push(fieldNode);
        }
      },
    },
    Field: {
      enter(field) {
        currentPath.push(field.name.value);

        if (currentPath.every((v, i) => v === parts[i])) {
          if (currentPath.length === parts.length) {
            return false;
          }

          const fieldName = parts[currentPath.length];

          // @ts-expect-error temp
          field.selectionSet ??= {
            kind: Kind.SELECTION_SET,
            selections: [],
          };

          let fieldNode: FieldNode = field.selectionSet!.selections.find(v => {
            return v.kind === Kind.FIELD && v.name.value === fieldName;
          }) as FieldNode;

          if (!fieldNode) {
            fieldNode = {
              kind: Kind.FIELD,
              name: {
                kind: Kind.NAME,
                value: fieldName,
              },
            };

            (field.selectionSet!.selections as SelectionNode[]).push(fieldNode);
          }
        }
      },
      leave() {
        currentPath.pop();
      },
    },
  });

  return print(doc);
}

export function deletePathFromQuery(query: string, path: string, operationName?: string) {
  query = healQuery(query);

  const [operation, ...segments] = path.split('.') as [OperationTypeNode, ...string[]];

  let doc: DocumentNode | undefined;

  try {
    doc = parse(query);
  } catch {
    // console.error(error);
  }

  if (!doc) {
    return query;
  }

  let operationDefinition: OperationDefinitionNode = doc.definitions.find(v => {
    if (v.kind === Kind.OPERATION_DEFINITION && v.operation === operation) {
      if (operationName) {
        return v.name?.value === operationName;
      }

      return true;
    }

    return false;
  }) as OperationDefinitionNode;

  if (!operationDefinition) {
    return query;
  }

  const currentPath: string[] = [];
  let isOperationSelectionSetEmpty = false;

  visit(operationDefinition, {
    OperationDefinition: {
      enter(operationDefinition) {
        if (segments.length === 1) {
          const fieldName = segments[0];

          if (operationDefinition.selectionSet) {
            operationDefinition.selectionSet.selections =
              operationDefinition.selectionSet.selections.filter(v => {
                return v.kind !== Kind.FIELD || v.name.value !== fieldName;
              });

            isOperationSelectionSetEmpty = operationDefinition.selectionSet.selections.length === 0;
          }
        }
      },
    },
    Field: {
      enter(field) {
        currentPath.push(field.name.value);

        if (
          currentPath.length === segments.length - 1 &&
          currentPath.every((v, i) => v === segments[i])
        ) {
          const fieldName = segments[currentPath.length];

          if (field.selectionSet) {
            field.selectionSet.selections = field.selectionSet.selections.filter(v => {
              return v.kind !== Kind.FIELD || v.name.value !== fieldName;
            });
          }
        }
      },
      leave() {
        currentPath.pop();
      },
    },
  });

  if (isOperationSelectionSetEmpty) {
    if (doc.definitions.length > 1) {
      return `${print({ ...doc, definitions: doc.definitions.filter(v => v !== operationDefinition) })}
${operation} ${operationDefinition.name?.value} {}`;
    }

    return `${operation} ${operationDefinition.name?.value} {}`;
  }

  operationDefinition = doc.definitions.find(v => {
    if (v.kind === Kind.OPERATION_DEFINITION && v.operation === operation) {
      if (operationName) {
        return v.name?.value === operationName;
      }

      return true;
    }

    return false;
  }) as OperationDefinitionNode;

  return print(doc);
}

export async function getOperationHash(
  operation: Pick<LaboratoryOperation, 'query' | 'variables'>,
) {
  try {
    console.log(operation.query, operation.variables);

    const canonicalQuery = print(parse(operation.query));
    const canonicalVariables = '';
    const canonical = `${canonicalQuery}\n${canonicalVariables}`;

    const encoder = new TextEncoder();
    const data = encoder.encode(canonical);

    const hashBuffer = await crypto.subtle.digest('SHA-256', data);

    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    return hashHex;
  } catch {
    // console.error(error);
    return null;
  }
}

export function getOperationName(query: string) {
  try {
    const doc = parse(query);
    const operationDefinition = doc.definitions.find(v => v.kind === Kind.OPERATION_DEFINITION);
    return operationDefinition?.name?.value;
  } catch {
    // console.error(error);

    const match = query.match(/(query|mutation|subscription)\s+([a-zA-Z0-9_]+)/);

    return match ? match[2] : null;
  }
}

export function getOperationType(query: string) {
  try {
    const doc = parse(query);
    const operationDefinition = doc.definitions.find(v => v.kind === Kind.OPERATION_DEFINITION);
    return operationDefinition?.operation;
  } catch {
    return null;
  }
}

export function isArgInQuery(query: string, path: string, argName: string, operationName?: string) {
  if (!query || !path) {
    return false;
  }

  query = healQuery(query);

  const [operation, ...segments] = path.split('.') as [OperationTypeNode, ...string[]];

  let doc: DocumentNode | undefined;

  try {
    doc = parse(query);
  } catch {
    // console.error(error);
  }

  if (!doc) {
    return false;
  }

  const operationDefinition: OperationDefinitionNode = doc.definitions.find(v => {
    if (v.kind === Kind.OPERATION_DEFINITION && v.operation === operation) {
      if (operationName) {
        return v.name?.value === operationName;
      }

      return true;
    }

    return false;
  }) as OperationDefinitionNode;

  if (!operationDefinition) {
    return false;
  }

  const currentPath: string[] = [];

  let found = false;

  visit(operationDefinition, {
    Field: {
      enter(field) {
        currentPath.push(field.name.value);

        if (
          currentPath.length === segments.length &&
          currentPath.every((v, i) => v === segments[i]) &&
          field.arguments
        ) {
          found = field.arguments.some(v => v.name.value === argName);
        }
      },
      leave() {
        currentPath.pop();
      },
    },
  });

  return found;
}

export function extractOfType(
  type: GraphQLOutputType,
): GraphQLObjectType | GraphQLScalarType | null {
  if (type instanceof GraphQLNonNull) {
    return extractOfType(type.ofType);
  }

  if (type instanceof GraphQLNonNull) {
    return extractOfType(type.ofType);
  }

  if (type instanceof GraphQLList) {
    return extractOfType(type.ofType);
  }

  if (type instanceof GraphQLObjectType) {
    return type;
  }

  if (type instanceof GraphQLScalarType) {
    return type;
  }

  return null;
}

export function findFieldInSchema(path: string, schema: GraphQLSchema) {
  const [operation, ...segments] = path.split('.') as [OperationTypeNode, ...string[]];

  let type: Maybe<GraphQLType>;

  if (operation === 'query') {
    type = schema.getQueryType();
  } else if (operation === 'mutation') {
    type = schema.getMutationType();
  } else if (operation === 'subscription') {
    type = schema.getSubscriptionType();
  }

  if (!type) {
    return;
  }

  for (let i = 0; i < segments.length; ++i) {
    if (!type) {
      return;
    }

    if (type instanceof GraphQLObjectType) {
      const field = type.getFields()[segments[i]] as GraphQLField<unknown, unknown, unknown>;

      if (!field) {
        return;
      }

      if (i === segments.length - 1) {
        return field;
      }

      type = extractOfType(field.type);
    }
  }

  return null;
}

export function addArgToField(
  query: string,
  path: string,
  argName: string,
  schema: GraphQLSchema,
  operationName?: string,
) {
  query = healQuery(query);

  const [operation, ...segments] = path.split('.') as [OperationTypeNode, ...string[]];

  let doc: DocumentNode | undefined;

  try {
    doc = parse(query);
  } catch {
    // console.error(error);
  }

  doc ||= {
    kind: Kind.DOCUMENT,
    definitions: [
      {
        kind: Kind.OPERATION_DEFINITION,
        operation,
        name: {
          kind: Kind.NAME,
          value: 'NewOperation',
        },
        selectionSet: {
          kind: Kind.SELECTION_SET,
          selections: [],
        },
      },
    ],
  };

  let operationDefinition: OperationDefinitionNode = doc.definitions.find(v => {
    if (v.kind === Kind.OPERATION_DEFINITION && v.operation === operation) {
      if (operationName) {
        return v.name?.value === operationName;
      }

      return true;
    }

    return false;
  }) as OperationDefinitionNode;

  if (!operationDefinition) {
    operationDefinition = {
      kind: Kind.OPERATION_DEFINITION,
      operation,
      name: {
        kind: Kind.NAME,
        value: 'NewOperation',
      },
      selectionSet: {
        kind: Kind.SELECTION_SET,
        selections: [],
      },
    };

    (doc.definitions as DefinitionNode[]).push(operationDefinition);
  }

  query = print(doc);

  if (!isPathInQuery(query, path, operationName)) {
    doc = parse(addPathToQuery(query, path, operationName));

    operationDefinition = doc.definitions.find(v => {
      if (v.kind === Kind.OPERATION_DEFINITION && v.operation === operation) {
        if (operationName) {
          return v.name?.value === operationName;
        }

        return true;
      }

      return false;
    }) as OperationDefinitionNode;
  }

  const currentPath: string[] = [];

  visit(operationDefinition, {
    Field: {
      enter(field) {
        currentPath.push(field.name.value);

        if (
          currentPath.length === segments.length - 1 &&
          currentPath.every((v, i) => v === segments[i])
        ) {
          const fieldName = segments[currentPath.length];

          if (field.selectionSet) {
            const typeField = findFieldInSchema(
              [operation, ...currentPath, fieldName].join('.'),
              schema,
            );

            if (typeField?.args) {
              const arg = typeField.args.find(v => v.name === argName);

              if (arg) {
                // @ts-expect-error temp
                operationDefinition.variableDefinitions ||= [];

                let variableName = arg.name;

                let i = 2;

                while (
                  (operationDefinition.variableDefinitions as VariableDefinitionNode[]).find(
                    v => v.variable.name.value === variableName,
                  )
                ) {
                  variableName = arg.name + i;
                  ++i;
                }

                (operationDefinition.variableDefinitions as VariableDefinitionNode[]).push({
                  kind: Kind.VARIABLE_DEFINITION,
                  variable: {
                    kind: Kind.VARIABLE,
                    name: {
                      kind: Kind.NAME,
                      value: variableName,
                    },
                  },
                  type: {
                    kind: Kind.NAMED_TYPE,
                    name: {
                      kind: Kind.NAME,
                      value: arg.type.toString(),
                    },
                  },
                });

                const fieldNode: FieldNode = field.selectionSet.selections.find(v => {
                  return v.kind === Kind.FIELD && v.name.value === fieldName;
                }) as FieldNode;

                if (fieldNode) {
                  // @ts-expect-error temp
                  fieldNode.arguments ||= [];

                  // @ts-expect-error temp
                  fieldNode.arguments.push({
                    kind: Kind.ARGUMENT,
                    name: {
                      kind: Kind.NAME,
                      value: argName,
                    },
                    value: {
                      kind: Kind.VARIABLE,
                      name: {
                        kind: Kind.NAME,
                        value: variableName,
                      },
                    },
                  });
                }
              }
            }
          }
        }
      },
      leave() {
        currentPath.pop();
      },
    },
    OperationDefinition: {
      enter(operationDefinition) {
        if (segments.length === 1) {
          const fieldName = segments[0];

          if (operationDefinition.selectionSet) {
            const typeField = findFieldInSchema(
              [operation, ...currentPath, fieldName].join('.'),
              schema,
            );

            if (typeField?.args) {
              const arg = typeField.args.find(v => v.name === argName);

              if (arg) {
                // @ts-expect-error temp
                operationDefinition.variableDefinitions ||= [];

                let variableName = arg.name;

                let i = 2;

                while (
                  (operationDefinition.variableDefinitions as VariableDefinitionNode[]).find(
                    v => v.variable.name.value === variableName,
                  )
                ) {
                  variableName = arg.name + i;
                  ++i;
                }

                (operationDefinition.variableDefinitions as VariableDefinitionNode[]).push({
                  kind: Kind.VARIABLE_DEFINITION,
                  variable: {
                    kind: Kind.VARIABLE,
                    name: {
                      kind: Kind.NAME,
                      value: variableName,
                    },
                  },
                  type: {
                    kind: Kind.NAMED_TYPE,
                    name: {
                      kind: Kind.NAME,
                      value: arg.type.toString(),
                    },
                  },
                });

                const fieldNode: FieldNode = operationDefinition.selectionSet.selections.find(v => {
                  return v.kind === Kind.FIELD && v.name.value === fieldName;
                }) as FieldNode;

                if (fieldNode) {
                  // @ts-expect-error temp
                  fieldNode.arguments ||= [];

                  // @ts-expect-error temp
                  fieldNode.arguments.push({
                    kind: Kind.ARGUMENT,
                    name: {
                      kind: Kind.NAME,
                      value: argName,
                    },
                    value: {
                      kind: Kind.VARIABLE,
                      name: {
                        kind: Kind.NAME,
                        value: variableName,
                      },
                    },
                  });
                }
              }
            }
          }
        }
      },
    },
  });

  return print(doc);
}

export function removeArgFromField(
  query: string,
  path: string,
  argName: string,
  operationName?: string,
) {
  query = healQuery(query);

  const [operation, ...segments] = path.split('.') as [OperationTypeNode, ...string[]];

  let doc: DocumentNode | undefined;

  try {
    doc = parse(query);
  } catch {
    // console.error(error);
  }

  if (!doc) {
    return query;
  }

  const operationDefinition: OperationDefinitionNode = doc.definitions.find(v => {
    if (v.kind === Kind.OPERATION_DEFINITION && v.operation === operation) {
      if (operationName) {
        return v.name?.value === operationName;
      }

      return true;
    }

    return false;
  }) as OperationDefinitionNode;

  if (!operationDefinition) {
    return query;
  }

  const currentPath: string[] = [];

  visit(operationDefinition, {
    Field: {
      enter(field) {
        currentPath.push(field.name.value);

        if (
          currentPath.length === segments.length - 1 &&
          currentPath.every((v, i) => v === segments[i])
        ) {
          const fieldName = segments[currentPath.length];

          if (field.selectionSet) {
            const fieldNode: FieldNode = field.selectionSet.selections.find(v => {
              return v.kind === Kind.FIELD && v.name.value === fieldName;
            }) as FieldNode;

            if (fieldNode?.arguments) {
              // @ts-expect-error temp
              fieldNode.arguments = fieldNode.arguments.filter(v => {
                return v.kind !== Kind.ARGUMENT || v.name.value !== argName;
              });
            }
          }
        }
      },
      leave() {
        currentPath.pop();
      },
    },
    OperationDefinition: {
      enter(operationDefinition) {
        if (segments.length === 1) {
          const fieldName = segments[0];

          if (operationDefinition.selectionSet) {
            const fieldNode: FieldNode = operationDefinition.selectionSet.selections.find(v => {
              return v.kind === Kind.FIELD && v.name.value === fieldName;
            }) as FieldNode;

            if (fieldNode?.arguments) {
              // @ts-expect-error temp
              fieldNode.arguments = fieldNode.arguments.filter(v => {
                return v.kind !== Kind.ARGUMENT || v.name.value !== argName;
              });
            }
          }
        }
      },
    },
  });

  return print(doc);
}

export function extractPaths(query: string): string[][] {
  try {
    const ast = parse(query);
    const paths: string[][] = [
      [
        ast.definitions[0].kind === Kind.OPERATION_DEFINITION
          ? ast.definitions[0].operation
          : 'query',
      ],
    ];

    const traverse = (selections: readonly SelectionNode[], currentPath: string[] = []) => {
      for (const selection of selections) {
        if (selection.kind === 'Field') {
          const newPath = [...currentPath, selection.name.value];
          paths.push(newPath);

          if (selection.selectionSet) {
            traverse(selection.selectionSet.selections, newPath);
          }
        }
      }
    };

    for (const def of ast.definitions) {
      if (def.kind === 'OperationDefinition' && def.selectionSet) {
        traverse(def.selectionSet.selections, paths[0]);
      }
    }

    return paths;
  } catch {
    return [];
  }
}

export function getOpenPaths(query: string): string[] {
  return extractPaths(query).map(v => v.join('.'));
}

type SearchableFieldType = GraphQLObjectType | GraphQLInterfaceType;

export type SchemaPathSearchEntry = {
  path: string;
  segmentsLower: string[];
  pathLower: string;
  pathWithoutOperationLower: string;
};

export type SchemaSearchResult = {
  matchedPaths: string[];
  visiblePaths: Set<string>;
  forcedOpenPaths: Set<string>;
  hasMore: boolean;
  nodesVisited: number;
};

function unwrapNamedType(type: GraphQLOutputType): GraphQLNamedType {
  if (type instanceof GraphQLNonNull || type instanceof GraphQLList) {
    return unwrapNamedType(type.ofType);
  }

  return type;
}

function isSearchableFieldType(type: GraphQLNamedType): type is SearchableFieldType {
  return type instanceof GraphQLObjectType || type instanceof GraphQLInterfaceType;
}

function isLeafFieldType(type: GraphQLNamedType): boolean {
  return (
    type instanceof GraphQLScalarType ||
    type instanceof GraphQLEnumType ||
    type instanceof GraphQLUnionType
  );
}

function collectOperationPaths(
  operation: OperationTypeNode,
  rootType: SearchableFieldType,
  result: string[][],
  maxDepth: number,
) {
  const rootFields = Object.values(rootType.getFields());
  const pathBuffer: string[] = [operation];

  const walk = (field: GraphQLField<unknown, unknown, unknown>, seenTypes: Set<string>) => {
    pathBuffer.push(field.name);
    result.push([...pathBuffer]);

    if (pathBuffer.length >= maxDepth + 1) {
      pathBuffer.pop();
      return;
    }

    const namedType = unwrapNamedType(field.type);

    if (isLeafFieldType(namedType) || !isSearchableFieldType(namedType)) {
      pathBuffer.pop();
      return;
    }

    if (seenTypes.has(namedType.name)) {
      pathBuffer.pop();
      return;
    }

    const nextSeenTypes = new Set(seenTypes);
    nextSeenTypes.add(namedType.name);

    for (const childField of Object.values(namedType.getFields())) {
      walk(childField, nextSeenTypes);
    }

    pathBuffer.pop();
  };

  for (const rootField of rootFields) {
    walk(rootField, new Set([rootType.name]));
  }
}

export function schemaToPaths(schema: GraphQLSchema, maxDepth = 8): string[][] {
  const result: string[][] = [];

  const operationTypes: [OperationTypeNode, SearchableFieldType | null][] = [
    [OperationTypeNode.QUERY, schema.getQueryType() ?? null],
    [OperationTypeNode.MUTATION, schema.getMutationType() ?? null],
    [OperationTypeNode.SUBSCRIPTION, schema.getSubscriptionType() ?? null],
  ];

  for (const [operation, rootType] of operationTypes) {
    if (!rootType) {
      continue;
    }

    collectOperationPaths(operation, rootType, result, maxDepth);
  }

  return result;
}

export function pathsToStrings(paths: readonly string[][]): string[] {
  return paths.map(path => path.join('.'));
}

export function createSchemaPathSearchIndex(paths: readonly string[]): SchemaPathSearchEntry[] {
  return paths.map(path => {
    const segments = path.split('.');
    const segmentsLower = segments.map(segment => segment.toLowerCase());

    return {
      path,
      segmentsLower,
      pathLower: path.toLowerCase(),
      pathWithoutOperationLower: segmentsLower.slice(1).join('.'),
    };
  });
}

function matchesDottedSearch(entry: SchemaPathSearchEntry, searchSegments: string[]): boolean {
  const segmentsLower = entry.segmentsLower;
  const maxStart = segmentsLower.length - searchSegments.length;

  if (maxStart < 1) {
    return false;
  }

  for (let start = 1; start <= maxStart; ++start) {
    let matches = true;

    for (let i = 0; i < searchSegments.length; ++i) {
      if (!segmentsLower[start + i].includes(searchSegments[i])) {
        matches = false;
        break;
      }
    }

    if (matches) {
      return true;
    }
  }

  return false;
}

export function searchSchemaPathIndex(
  index: readonly SchemaPathSearchEntry[],
  search: string,
  limit = 1000,
): string[] {
  const normalizedSearch = search.trim().toLowerCase();

  if (!normalizedSearch) {
    return [];
  }

  const searchSegments = normalizedSearch.split('.').filter(Boolean);
  const useSegmentSearch = searchSegments.length > 1;
  const result: string[] = [];

  for (const entry of index) {
    const isMatch = useSegmentSearch
      ? matchesDottedSearch(entry, searchSegments)
      : entry.pathWithoutOperationLower.includes(normalizedSearch) ||
        entry.pathLower.includes(normalizedSearch);

    if (!isMatch) {
      continue;
    }

    result.push(entry.path);

    if (result.length >= limit) {
      break;
    }
  }

  return result;
}

export function buildVisiblePathSet(paths: readonly string[]): Set<string> {
  const result = new Set<string>();

  for (const path of paths) {
    let dotIndex = path.indexOf('.');

    while (dotIndex !== -1) {
      result.add(path.slice(0, dotIndex));
      dotIndex = path.indexOf('.', dotIndex + 1);
    }

    result.add(path);
  }

  return result;
}

export function buildForcedOpenPathSet(paths: readonly string[]): Set<string> {
  const result = new Set<string>();

  for (const path of paths) {
    let dotIndex = path.indexOf('.');

    while (dotIndex !== -1) {
      result.add(path.slice(0, dotIndex));
      dotIndex = path.indexOf('.', dotIndex + 1);
    }
  }

  return result;
}

function matchSearchAgainstPath(
  pathSegmentsLower: readonly string[],
  normalizedSearch: string,
  searchSegments: readonly string[],
): boolean {
  if (searchSegments.length > 1) {
    const maxStart = pathSegmentsLower.length - searchSegments.length;

    if (maxStart < 0) {
      return false;
    }

    for (let start = 0; start <= maxStart; ++start) {
      let matched = true;

      for (let i = 0; i < searchSegments.length; ++i) {
        if (!pathSegmentsLower[start + i].includes(searchSegments[i])) {
          matched = false;
          break;
        }
      }

      if (matched) {
        return true;
      }
    }

    return false;
  }

  for (const segment of pathSegmentsLower) {
    if (segment.includes(normalizedSearch)) {
      return true;
    }
  }

  return false;
}

export function searchSchemaPaths(
  schema: GraphQLSchema,
  search: string,
  options?: {
    maxDepth?: number;
    maxMatches?: number;
    maxNodes?: number;
    operationTypes?: OperationTypeNode[];
  },
): SchemaSearchResult {
  const normalizedSearch = search.trim().toLowerCase();

  if (!normalizedSearch) {
    return {
      matchedPaths: [],
      visiblePaths: new Set(),
      forcedOpenPaths: new Set(),
      hasMore: false,
      nodesVisited: 0,
    };
  }

  const maxDepth = options?.maxDepth ?? 8;
  const maxMatches = options?.maxMatches ?? 500;
  const maxNodes = options?.maxNodes ?? 40000;
  const searchSegments = normalizedSearch.split('.').filter(Boolean);
  const matchedPaths: string[] = [];
  const visiblePaths = new Set<string>();
  const forcedOpenPaths = new Set<string>();

  type Frame = {
    operation: OperationTypeNode;
    field: GraphQLField<unknown, unknown, unknown>;
    pathSegments: string[];
    typeTrail: string[];
    depth: number;
  };

  const queue: Frame[] = [];
  let queueIndex = 0;

  const operationTypes: [OperationTypeNode, SearchableFieldType | null][] = [
    [OperationTypeNode.QUERY, schema.getQueryType() ?? null],
    [OperationTypeNode.MUTATION, schema.getMutationType() ?? null],
    [OperationTypeNode.SUBSCRIPTION, schema.getSubscriptionType() ?? null],
  ];

  const filteredOperationTypes =
    options?.operationTypes && options.operationTypes.length > 0
      ? operationTypes.filter(([operation]) => options.operationTypes!.includes(operation))
      : operationTypes;

  for (const [operation, rootType] of filteredOperationTypes) {
    if (!rootType) {
      continue;
    }

    for (const rootField of Object.values(rootType.getFields())) {
      queue.push({
        operation,
        field: rootField,
        pathSegments: [rootField.name],
        typeTrail: [rootType.name],
        depth: 1,
      });
    }
  }

  let nodesVisited = 0;
  let hasMore = false;

  while (queueIndex < queue.length) {
    if (nodesVisited >= maxNodes || matchedPaths.length >= maxMatches) {
      hasMore = true;
      break;
    }

    const frame = queue[queueIndex++] as Frame;
    ++nodesVisited;

    const path = `${frame.operation}.${frame.pathSegments.join('.')}`;
    const pathSegmentsLower = frame.pathSegments.map(segment => segment.toLowerCase());

    if (matchSearchAgainstPath(pathSegmentsLower, normalizedSearch, searchSegments)) {
      matchedPaths.push(path);
      visiblePaths.add(path);

      let dotIndex = path.indexOf('.');

      while (dotIndex !== -1) {
        const parentPath = path.slice(0, dotIndex);
        visiblePaths.add(parentPath);
        forcedOpenPaths.add(parentPath);
        dotIndex = path.indexOf('.', dotIndex + 1);
      }
    }

    if (frame.depth >= maxDepth) {
      continue;
    }

    const namedType = unwrapNamedType(frame.field.type);

    if (!isSearchableFieldType(namedType) || frame.typeTrail.includes(namedType.name)) {
      continue;
    }

    const nextTrail = [...frame.typeTrail, namedType.name];

    for (const childField of Object.values(namedType.getFields())) {
      queue.push({
        operation: frame.operation,
        field: childField,
        pathSegments: [...frame.pathSegments, childField.name],
        typeTrail: nextTrail,
        depth: frame.depth + 1,
      });
    }
  }

  return {
    matchedPaths,
    visiblePaths,
    forcedOpenPaths,
    hasMore,
    nodesVisited,
  };
}

export function handleTemplate(query: string, env: Record<string, any>) {
  return query.replace(/\{\{(.*?)\}\}/g, (match, p1) => {
    return get(env, p1) ?? match;
  });
}

export function getFieldByPath(path: string, schema: GraphQLSchema) {
  const [operation, ...segments] = path.split('.') as [OperationTypeNode, ...string[]];

  let type: Maybe<GraphQLType>;

  if (operation === 'query') {
    type = schema.getQueryType();
  } else if (operation === 'mutation') {
    type = schema.getMutationType();
  } else if (operation === 'subscription') {
    type = schema.getSubscriptionType();
  }

  if (!type) {
    return null;
  }

  let field: Maybe<GraphQLField<unknown, unknown, unknown>>;

  for (const segment of segments) {
    if (type instanceof GraphQLObjectType) {
      field = type.getFields()[segment] as GraphQLField<unknown, unknown, unknown>;

      if (!field) {
        return null;
      }

      type = field.type;
    }
  }

  return field;
}
