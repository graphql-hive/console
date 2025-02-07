import { Editor, EditorProps } from '@monaco-editor/react';
import { defaultEditorProps } from './_defaultEditorProps';

export const defaultProps: Readonly<EditorProps> = {
  ...defaultEditorProps,
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
