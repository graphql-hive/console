import clsx from 'clsx';
import { MonacoEditorReact } from '@/lib/MonacoEditorReact';

export const defaultEditorProps: Readonly<MonacoEditorReact.EditorProps> = {
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
