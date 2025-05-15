import { Editor, EditorProps } from '@monaco-editor/react';
import { defaultEditorProps } from './_defaultEditorProps';

export const defaultProps: Readonly<EditorProps> = {
  ...defaultEditorProps,
  defaultLanguage: 'json',
  options: {
    ...defaultEditorProps.options,
    lineNumbers: 'off',
    tabSize: 2,
  },
};

export const EnvironmentEditor: React.FC<EditorProps> = props => {
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
