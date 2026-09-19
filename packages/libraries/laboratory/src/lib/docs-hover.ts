import { getNamedType, type GraphQLSchema } from 'graphql';
import { getContextAtPosition, getHoverInformation, Position } from 'graphql-language-service';
import * as monaco from 'monaco-editor';
import type { LaboratoryDocsTarget } from './docs';

export const OPEN_DOCS_COMMAND_ID = 'hive-laboratory.openDocs';

/** graphql-language-service positions are 0-based, Monaco's are 1-based. */
const toLanguageServicePosition = (position: monaco.IPosition) =>
  new Position(position.lineNumber - 1, position.column - 1);

export const docsTargetAtPosition = (
  schema: GraphQLSchema,
  text: string,
  position: monaco.IPosition,
): LaboratoryDocsTarget | null => {
  const context = getContextAtPosition(text, toLanguageServicePosition(position), schema);

  if (!context) {
    return null;
  }

  const { typeInfo } = context;

  if (typeInfo.fieldDef && typeInfo.parentType) {
    return {
      kind: 'field',
      typeName: getNamedType(typeInfo.parentType).name,
      fieldName: typeInfo.fieldDef.name,
    };
  }

  const type = typeInfo.type ?? typeInfo.inputType;

  return type ? { kind: 'type', name: getNamedType(type).name } : null;
};

/**
 * monaco-graphql owns the GraphQL hover, and its content is produced in a worker
 * we cannot reach into. Rather than stack a second hover card next to it, the mode
 * config turns theirs off (see `syncMonacoGraphQL`) and this provider rebuilds it
 * from the same `getHoverInformation` call, with the docs link appended.
 */
export const registerDocsHover = (options: {
  getSchema: () => GraphQLSchema | null;
  openDocs: (target?: LaboratoryDocsTarget) => void;
}) => {
  const command = monaco.editor.registerCommand(OPEN_DOCS_COMMAND_ID, (_accessor, ...args) => {
    options.openDocs(args[0] as LaboratoryDocsTarget | undefined);
  });

  const provider = monaco.languages.registerHoverProvider('graphql', {
    provideHover(model, position) {
      const schema = options.getSchema();

      if (!schema) {
        return null;
      }

      const text = model.getValue();
      const info = getHoverInformation(
        schema,
        text,
        toLanguageServicePosition(position),
        undefined,
        {
          useMarkdown: true,
        },
      );

      if (!info || typeof info !== 'string') {
        return null;
      }

      const contents: monaco.IMarkdownString[] = [{ value: info }];
      const target = docsTargetAtPosition(schema, text, position);

      if (target) {
        contents.push({
          // Command links only run from trusted markdown.
          isTrusted: true,
          value: `[Open in Docs](command:${OPEN_DOCS_COMMAND_ID}?${encodeURIComponent(
            JSON.stringify([target]),
          )})`,
        });
      }

      return { contents };
    },
  });

  return () => {
    provider.dispose();
    command.dispose();
  };
};
