import {
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLScalarType,
  GraphQLSchema,
  Kind,
  OperationTypeNode,
  parse,
  print,
  visit,
  type DefinitionNode,
  type DocumentNode,
  type FieldNode,
  type GraphQLField,
  type GraphQLOutputType,
  type GraphQLType,
  type OperationDefinitionNode,
  type SelectionNode,
  type VariableDefinitionNode,
} from 'graphql';
import type { Maybe } from 'graphql/jsutils/Maybe';
import type { LaboratoryEnv } from '@/laboratory/lib/env';
import type { LaboratoryOperation } from '@/laboratory/lib/operations';

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

export function handleTemplate(query: string, env: LaboratoryEnv) {
  return query.replace(/\{\{(.*?)\}\}/g, (match, p1) => {
    return env.variables[p1] ?? match;
  });
}
