import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import {
  File as FileImpl,
  MultiFileDiff as MultiFileDiffImpl,
  Virtualizer,
  type FileProps,
  type MultiFileDiffProps,
} from '@pierre/diffs/react';
import { useTheme } from '../theme/theme-provider';

// Has a height because the virtualizer only renders lines inside its own scroll region.
export function CodeScrollArea(props: { className?: string; children: ReactNode }) {
  return (
    <Virtualizer className={cn('max-h-[70vh] overflow-auto', props.className)}>
      {props.children}
    </Virtualizer>
  );
}

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
