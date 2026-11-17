import { Kind, parse, type DefinitionNode, type NameNode } from 'graphql/index';

export type SdlDefinitionRange = {
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
};

export type SdlDefinitionIndex = {
  types: Map<string, SdlDefinitionRange>;
  directives: Map<string, SdlDefinitionRange>;
};

const TYPE_DEFINITIONS = new Set<string>([
  Kind.OBJECT_TYPE_DEFINITION,
  Kind.INTERFACE_TYPE_DEFINITION,
  Kind.UNION_TYPE_DEFINITION,
  Kind.ENUM_TYPE_DEFINITION,
  Kind.INPUT_OBJECT_TYPE_DEFINITION,
  Kind.SCALAR_TYPE_DEFINITION,
]);

const TYPE_EXTENSIONS = new Set<string>([
  Kind.OBJECT_TYPE_EXTENSION,
  Kind.INTERFACE_TYPE_EXTENSION,
  Kind.UNION_TYPE_EXTENSION,
  Kind.ENUM_TYPE_EXTENSION,
  Kind.INPUT_OBJECT_TYPE_EXTENSION,
  Kind.SCALAR_TYPE_EXTENSION,
]);

function rangeOf(name: NameNode): SdlDefinitionRange | null {
  const token = name.loc?.startToken;
  if (!token) {
    return null;
  }
  return {
    startLineNumber: token.line,
    startColumn: token.column,
    endLineNumber: token.line,
    endColumn: token.column + name.value.length,
  };
}

function nameOf(definition: DefinitionNode): NameNode | null {
  return 'name' in definition && definition.name ? definition.name : null;
}

// A subgraph often only extends a type owned elsewhere, so an extension stands in when
// there is no definition.
export function indexSdlDefinitions(sdl: string): SdlDefinitionIndex {
  const index: SdlDefinitionIndex = { types: new Map(), directives: new Map() };

  let definitions: readonly DefinitionNode[];
  try {
    definitions = parse(sdl).definitions;
  } catch {
    return index;
  }

  const extensions = new Map<string, SdlDefinitionRange>();

  for (const definition of definitions) {
    const name = nameOf(definition);
    const range = name ? rangeOf(name) : null;
    if (!name || !range) {
      continue;
    }
    if (definition.kind === Kind.DIRECTIVE_DEFINITION) {
      if (!index.directives.has(name.value)) {
        index.directives.set(name.value, range);
      }
    } else if (TYPE_DEFINITIONS.has(definition.kind)) {
      if (!index.types.has(name.value)) {
        index.types.set(name.value, range);
      }
    } else if (TYPE_EXTENSIONS.has(definition.kind)) {
      if (!extensions.has(name.value)) {
        extensions.set(name.value, range);
      }
    }
  }

  for (const [name, range] of extensions) {
    if (!index.types.has(name)) {
      index.types.set(name, range);
    }
  }

  return index;
}
