import clsx from 'clsx';
import { EditorProps } from '@monaco-editor/react';

export const defaultEditorProps: Readonly<EditorProps> = {
  theme: 'vs-dark',
  className: clsx('*:bg-[#10151f]'),
  options: {
    minimap: { enabled: false },
    padding: {
      top: 10,
    },
    scrollbar: {
      horizontalScrollbarSize: 6,
      verticalScrollbarSize: 6,
    },
  },
};
