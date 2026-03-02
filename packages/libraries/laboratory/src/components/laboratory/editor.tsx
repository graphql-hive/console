import { forwardRef, useEffect, useId, useImperativeHandle, useRef } from 'react';
import * as monaco from 'monaco-editor';
import { initializeMode } from 'monaco-graphql/initializeMode';
import { useLaboratory } from '@/components/laboratory/context';
import MonacoEditor, { loader } from '@monaco-editor/react';

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
    'editor.background': '#0f1214',
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

export const Editor = forwardRef<
  {
    setValue: (value: string) => void;
  },
  React.ComponentProps<typeof MonacoEditor> & {
    uri?: monaco.Uri;
    variablesUri?: monaco.Uri;
    extraLibs?: string[];
  }
>((props, ref) => {
  const id = useId();
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const { introspection, endpoint, theme } = useLaboratory();

  useEffect(() => {
    if (introspection) {
      const api = initializeMode({
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

      api.setCompletionSettings({
        __experimental__fillLeafsOnComplete: true,
      });
    }
  }, [introspection, props.uri?.toString(), props.variablesUri?.toString()]);

  useEffect(() => {
    if (props.extraLibs) {
      for (const lib of props.extraLibs) {
        monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
          target: monaco.languages.typescript.ScriptTarget.ESNext, // supports top-level await
          module: monaco.languages.typescript.ModuleKind.ESNext, // treat file as module
          allowNonTsExtensions: true,
          allowJs: true,
          lib: ['esnext', 'webworker'], // if running in sandbox
        });

        monaco.languages.typescript.typescriptDefaults.addExtraLib(
          lib,
          `file:///hive-lab-globals-${id}.d.ts`,
        );
      }
    }
  }, []);

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

  return (
    <div className="size-full">
      <MonacoEditor
        className="size-full"
        {...props}
        theme={theme === 'dark' ? 'hive-laboratory-dark' : 'hive-laboratory-light'}
        onMount={editor => {
          editorRef.current = editor;
        }}
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
