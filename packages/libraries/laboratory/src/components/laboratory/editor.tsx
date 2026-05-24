import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { OperationDefinitionNode, parse } from 'graphql';
import * as monaco from 'monaco-editor';
import { MonacoGraphQLAPI } from 'monaco-graphql/esm/api.js';
import { initializeMode } from 'monaco-graphql/initializeMode';
import { cn } from '@/lib/utils';
import MonacoEditor, { loader } from '@monaco-editor/react';
import { useLaboratory } from './context';

if (typeof window !== 'undefined') {
  (window as Window & typeof globalThis & { monaco: typeof monaco }).monaco = monaco;
}

loader.config({ monaco });

monaco.languages.register({ id: 'dotenv' });

const darkTheme: monaco.editor.IStandaloneThemeData = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: '', foreground: 'F8F9FA', background: 'fffffe' },
    { token: 'invalid', foreground: 'cd3131' },
    { token: 'emphasis', fontStyle: 'italic' },
    { token: 'strong', fontStyle: 'bold' },

    { token: 'variable', foreground: '001188' },
    { token: 'variable.predefined', foreground: '4864AA' },
    { token: 'constant', foreground: 'dd0000' },
    { token: 'comment', foreground: '15803d' },
    { token: 'number', foreground: 'fde68a' },
    { token: 'number.hex', foreground: '3030c0' },
    { token: 'regexp', foreground: '800000' },
    { token: 'annotation', foreground: '808080' },
    { token: 'type', foreground: 'fde68a' },

    { token: 'delimiter', foreground: '6E757C' },
    { token: 'delimiter.html', foreground: '383838' },
    { token: 'delimiter.xml', foreground: 'facc15' },

    { token: 'tag', foreground: '800000' },
    { token: 'tag.id.jade', foreground: '4F76AC' },
    { token: 'tag.class.jade', foreground: '4F76AC' },
    { token: 'meta.scss', foreground: '800000' },
    { token: 'metatag', foreground: 'e00000' },
    { token: 'metatag.content.html', foreground: 'FF0000' },
    { token: 'metatag.html', foreground: '808080' },
    { token: 'metatag.xml', foreground: '808080' },
    { token: 'metatag.php', fontStyle: 'bold' },

    { token: 'key', foreground: '93c5fd' },
    { token: 'string.key.json', foreground: '93c5fd' },
    { token: 'string.value.json', foreground: 'fdba74' },

    { token: 'attribute.name', foreground: 'FF0000' },
    { token: 'attribute.value', foreground: '34d399' },
    { token: 'attribute.value.number', foreground: 'fdba74' },
    { token: 'attribute.value.unit', foreground: 'fdba74' },
    { token: 'attribute.value.html', foreground: 'facc15' },
    { token: 'attribute.value.xml', foreground: 'facc15' },

    { token: 'string', foreground: '2dd4bf' },
    { token: 'string.html', foreground: 'facc15' },
    { token: 'string.sql', foreground: 'FF0000' },
    { token: 'string.yaml', foreground: '34d399' },

    { token: 'keyword', foreground: '60a5fa' },
    { token: 'keyword.json', foreground: '34d399' },
    { token: 'keyword.flow', foreground: 'AF00DB' },
    { token: 'keyword.flow.scss', foreground: 'facc15' },

    { token: 'operator.scss', foreground: '666666' },
    { token: 'operator.sql', foreground: '778899' },
    { token: 'operator.swift', foreground: '666666' },
    { token: 'predefined.sql', foreground: 'FF00FF' },
  ],
  colors: {
    'editor.foreground': '#f6f8fa',
    'editor.background': '#0f121400',
    'editor.selectionBackground': '#2A2F34',
    'editor.inactiveSelectionBackground': '#2A2F34',
    'editor.lineHighlightBackground': '#2A2F34',
    'editorCursor.foreground': '#ffffff',
    'editorWhitespace.foreground': '#6a737d',
    'editorIndentGuide.background': '#6E757C',
    'editorIndentGuide.activeBackground': '#CFD4D9',
    'editor.selectionHighlightBorder': '#2A2F34',
  },
};

monaco.editor.defineTheme('hive-laboratory-dark', darkTheme);

const lightTheme: monaco.editor.IStandaloneThemeData = {
  base: 'vs',
  inherit: true,
  rules: [],
  colors: {},
};

monaco.editor.defineTheme('hive-laboratory-light', lightTheme);

monaco.languages.setMonarchTokensProvider('dotenv', {
  tokenizer: {
    root: [
      [/^\s*#.*$/, 'comment'],
      [/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/, 'key', '@value'],
    ],

    value: [
      [/"([^"\\]|\\.)*$/, 'string', '@pop'],
      [/"([^"\\]|\\.)*"/, 'string', '@pop'],
      [/'([^'\\]|\\.)*$/, 'string', '@pop'],
      [/'([^'\\]|\\.)*'/, 'string', '@pop'],
      [/[^#\n]+/, 'string', '@pop'],
    ],
  },
});

export type EditorHandle = {
  setValue: (value: string) => void;
};

export type EditorProps = React.ComponentProps<typeof MonacoEditor> & {
  uri?: monaco.Uri;
  variablesUri?: monaco.Uri;
  extraLibs?: string[];
  onOperationNameChange?: (operationName: string | null) => void;
};

const EditorInner = forwardRef<EditorHandle, EditorProps>((props, ref) => {
  const id = useId();
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const { introspection, endpoint, theme } = useLaboratory();
  const wantsJson = props.language === 'json' || props.defaultLanguage === 'json';
  const [typescriptReady, setTypescriptReady] = useState(!!monaco.languages.typescript);
  const [jsonReady, setJsonReady] = useState(
    monaco.languages.getLanguages().some(language => language.id === 'json'),
  );
  const apiRef = useRef<MonacoGraphQLAPI | null>(null);

  useEffect(() => {
    if (introspection) {
      if (apiRef.current) {
        apiRef.current.setSchemaConfig([
          {
            introspectionJSON: introspection,
            uri: `schema_${endpoint}.graphql`,
          },
        ]);
      } else {
        apiRef.current = initializeMode({
          schemas: [
            {
              introspectionJSON: introspection,
              uri: `schema_${endpoint}.graphql`,
            },
          ],
          diagnosticSettings:
            props.uri && props.variablesUri
              ? {
                  validateVariablesJSON: {
                    [props.uri.toString()]: [props.variablesUri.toString()],
                  },
                  jsonDiagnosticSettings: {
                    allowComments: true, // allow json, parse with a jsonc parser to make requests
                  },
                }
              : undefined,
        });

        apiRef.current.setCompletionSettings({
          __experimental__fillLeafsOnComplete: true,
        });
      }
    }
  }, [endpoint, introspection, props.uri?.toString(), props.variablesUri?.toString()]);

  useEffect(() => {
    void (async function () {
      if (wantsJson && !jsonReady) {
        await import('monaco-editor/esm/vs/language/json/monaco.contribution');
        setJsonReady(true);
      }

      if (!monaco.languages.typescript) {
        await import('monaco-editor/esm/vs/language/typescript/monaco.contribution');
        setTypescriptReady(true);
      }

      if (!props.extraLibs?.length) {
        return;
      }

      const ts = monaco.languages.typescript;

      if (!ts) {
        return;
      }

      const extraLibs = Object.values(ts.typescriptDefaults.getExtraLibs()).map(lib => lib.content);

      if (props.extraLibs.every(lib => extraLibs.includes(lib))) {
        return;
      }

      const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '_');

      ts.typescriptDefaults.setCompilerOptions({
        target: ts.ScriptTarget.ESNext,
        module: ts.ModuleKind.ESNext,
        allowNonTsExtensions: true,
        allowJs: true,
        lib: ['esnext', 'webworker'],
      });

      ts.typescriptDefaults.setExtraLibs(
        props.extraLibs.map((content, index) => ({
          content,
          filePath: `file:///hive-lab-globals-${safeId}-${index}.d.ts`,
        })),
      );
    })();
  }, [id, jsonReady, props.extraLibs, wantsJson]);

  useImperativeHandle(
    ref,
    () => ({
      setValue: (value: string) => {
        if (editorRef.current) {
          editorRef.current.setValue(value);
        }
      },
    }),
    [],
  );

  const setupDecorationsHandler = useCallback(
    (editor: monaco.editor.IStandaloneCodeEditor) => {
      let decorationsCollection: monaco.editor.IEditorDecorationsCollection | null = null;

      const handler = () => {
        decorationsCollection?.clear();

        try {
          const value = editor.getValue();
          const doc = parse(value);

          const definition = doc.definitions.find(definition => {
            if (definition.kind !== 'OperationDefinition') {
              return false;
            }

            if (!definition.loc) {
              return false;
            }

            const cursorPosition = editor.getPosition();

            if (cursorPosition) {
              return (
                definition.loc.startToken.line <= cursorPosition.lineNumber &&
                definition.loc.endToken.line >= cursorPosition.lineNumber
              );
            }
          });

          if (definition?.loc) {
            const decorations: monaco.editor.IModelDeltaDecoration[] = [];

            if (definition.loc.startToken.line > 1) {
              decorations.push({
                range: new monaco.Range(
                  0,
                  0,
                  definition.loc.startToken.line - 1,
                  definition.loc.startToken.column,
                ),
                options: {
                  isWholeLine: true,
                  inlineClassName: 'inactive-line',
                },
              });
            }

            const lineCount = editor.getModel()?.getLineCount() ?? 0;
            const lastLineMaxColumn = editor.getModel()?.getLineMaxColumn(lineCount) ?? 0;

            if (definition.loc.endToken.line < lineCount) {
              decorations.push({
                range: new monaco.Range(
                  definition.loc.endToken.line + 1,
                  definition.loc.endToken.column,
                  lineCount,
                  lastLineMaxColumn,
                ),
                options: {
                  isWholeLine: true,
                  inlineClassName: 'inactive-line',
                },
              });
            }

            decorationsCollection = editor.createDecorationsCollection(decorations);

            props.onOperationNameChange?.(
              (definition as OperationDefinitionNode).name?.value ?? null,
            );
          }
        } catch (error) {}
      };

      editor.onDidChangeCursorPosition(handler);

      handler();
    },
    [props.onOperationNameChange],
  );

  const handleMount = useCallback(
    (editor: monaco.editor.IStandaloneCodeEditor) => {
      editorRef.current = editor;
      setupDecorationsHandler(editor);
    },
    [setupDecorationsHandler],
  );

  const recentCursorPosition = useRef<{ lineNumber: number; column: number } | null>(null);

  useLayoutEffect(() => {
    recentCursorPosition.current = editorRef.current?.getPosition() ?? null;
  }, [props.value]);

  useEffect(() => {
    if (editorRef.current && recentCursorPosition.current) {
      editorRef.current.setPosition(recentCursorPosition.current);
      recentCursorPosition.current = null;
    }
  }, [props.value]);

  if (!typescriptReady && props.language === 'typescript') {
    return null;
  }

  if (!jsonReady && wantsJson) {
    return null;
  }

  return (
    <div className={cn('size-full overflow-hidden', props.className)}>
      <MonacoEditor
        {...props}
        className="size-full"
        theme={theme === 'dark' ? 'hive-laboratory-dark' : 'hive-laboratory-light'}
        onMount={handleMount}
        loading={null}
        options={{
          ...props.options,
          lineNumbers: 'on',
          cursorStyle: 'line',
          cursorBlinking: 'smooth',
          padding: {
            top: 16,
          },
          fontFamily:
            'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
          minimap: {
            enabled: false,
          },
          automaticLayout: true,
          tabSize: 2,
          formatOnPaste: true,
        }}
        defaultPath={props.uri?.toString()}
      />
    </div>
  );
});

export const Editor = EditorInner as unknown as (props: EditorProps) => JSX.Element;
