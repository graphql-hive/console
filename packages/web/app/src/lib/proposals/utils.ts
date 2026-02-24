import {
  DefinitionNode,
  DocumentNode,
  isTypeDefinitionNode,
  isTypeExtensionNode,
  Kind,
  visit,
} from 'graphql';

const extensionToDefinitionKindMap = {
  [Kind.OBJECT_TYPE_EXTENSION]: Kind.OBJECT_TYPE_DEFINITION,
  [Kind.INPUT_OBJECT_TYPE_EXTENSION]: Kind.INPUT_OBJECT_TYPE_DEFINITION,
  [Kind.INTERFACE_TYPE_EXTENSION]: Kind.INTERFACE_TYPE_DEFINITION,
  [Kind.UNION_TYPE_EXTENSION]: Kind.UNION_TYPE_DEFINITION,
  [Kind.ENUM_TYPE_EXTENSION]: Kind.ENUM_TYPE_DEFINITION,
  [Kind.SCALAR_TYPE_EXTENSION]: Kind.SCALAR_TYPE_DEFINITION,
} as const;

export function addTypeForExtensions(ast: DocumentNode) {
  const trackTypeDefs = new Map<
    string,
    | {
        state: 'TYPE_ONLY';
      }
    | {
        state: 'EXTENSION_ONLY' | 'VALID_EXTENSION';
        kind:
          | Kind.OBJECT_TYPE_EXTENSION
          | Kind.ENUM_TYPE_EXTENSION
          | Kind.UNION_TYPE_EXTENSION
          | Kind.SCALAR_TYPE_EXTENSION
          | Kind.INTERFACE_TYPE_EXTENSION
          | Kind.INPUT_OBJECT_TYPE_EXTENSION;
      }
  >();
  for (const node of ast.definitions) {
    if ('name' in node && node.name) {
      const name = node.name.value;
      const entry = trackTypeDefs.get(name);
      if (isTypeExtensionNode(node)) {
        console.log(node.kind);
        if (!entry) {
          trackTypeDefs.set(name, { state: 'EXTENSION_ONLY', kind: node.kind });
        } else if (entry.state === 'TYPE_ONLY') {
          trackTypeDefs.set(name, { kind: node.kind, state: 'VALID_EXTENSION' });
        }
      } else if (isTypeDefinitionNode(node)) {
        if (!entry) {
          trackTypeDefs.set(name, { state: 'TYPE_ONLY' });
        } else if (entry.state === 'EXTENSION_ONLY') {
          trackTypeDefs.set(name, { ...entry, state: 'VALID_EXTENSION' });
        }
      }
    }
  }

  const astCopy = visit(ast, {});
  for (const [name, entry] of trackTypeDefs) {
    if (entry.state === 'EXTENSION_ONLY') {
      (astCopy.definitions as DefinitionNode[]).push({
        kind: extensionToDefinitionKindMap[entry.kind],
        name: {
          kind: Kind.NAME,
          value: name,
        },
      });
    }
  }
  return astCopy;
}
