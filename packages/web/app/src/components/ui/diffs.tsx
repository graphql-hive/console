import {
  File as FileImpl,
  MultiFileDiff as MultiFileDiffImpl,
  type FileProps,
  type MultiFileDiffProps,
} from '@pierre/diffs/react';
import { useTheme } from '../theme/theme-provider';

export function File<LAnnotation>(props: FileProps<LAnnotation>) {
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

export function MultiFileDiff<LAnnotation>(props: MultiFileDiffProps<LAnnotation>) {
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
