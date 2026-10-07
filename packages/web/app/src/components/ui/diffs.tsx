import {
  File as FileImpl,
  MultiFileDiff as MultiFileDiffImpl,
  type FileProps,
  type MultiFileDiffProps,
} from '@pierre/diffs/react';
import { useTheme } from '../theme/theme-provider';

export function File<LAnnotation = undefined, Caret = undefined>(
  props: FileProps<LAnnotation, Caret>,
) {
  const { resolvedTheme } = useTheme();
  return (
    <FileImpl
      {...props}
      options={{
        theme: resolvedTheme === 'dark' ? 'pierre-dark' : 'pierre-light',
        ...props.options,
      }}
    />
  );
}

export function MultiFileDiff<LAnnotation = undefined, Caret = undefined>(
  props: MultiFileDiffProps<LAnnotation, Caret>,
) {
  const { resolvedTheme } = useTheme();
  return (
    <MultiFileDiffImpl
      {...props}
      options={{
        theme: resolvedTheme === 'dark' ? 'pierre-dark' : 'pierre-light',
        ...props.options,
      }}
    />
  );
}
