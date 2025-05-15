import { MonacoEditorReact } from '@/lib/MonacoEditorReact';
import { Editor, EditorProps } from '@monaco-editor/react';
import labApiDefinitionRaw from '../lab-api-declaration?raw';
import { defaultEditorProps } from './_defaultEditorProps';

export const defaultProps: Readonly<EditorProps> = {
  ...defaultEditorProps,
  beforeMount: (monaco: MonacoEditorReact.Monaco) => {
    // Add custom typings for globalThis
    monaco.languages.typescript.javascriptDefaults.addExtraLib(
      `
        ${labApiDefinitionRaw}
        declare const lab: LabAPI;
      `,
      'global.d.ts',
    );
  },
  defaultLanguage: 'javascript',
  language: 'javascript',
  options: {
    ...defaultEditorProps.options,
    quickSuggestions: true,
    suggestOnTriggerCharacters: true,
    acceptSuggestionOnEnter: 'on',
    tabCompletion: 'on',
    folding: true,
    foldingStrategy: 'indentation',
  },
};

export const ScriptEditor: React.FC<EditorProps> = props => {
  return (
    <Editor
      {...defaultProps}
      {...props}
      options={{
        ...defaultProps.options,
        ...props.options,
      }}
    />
  );
};
