import { forwardRef, type CSSProperties } from 'react';
import { lenient } from '@/lib/recipe';
import { textareaStyles } from './textarea.css';

const textareaVariants = lenient(textareaStyles.root);

// `field-sizing` is not in React's CSSProperties yet. It makes the textarea grow with its text
// natively where the browser supports it; elsewhere the field keeps its rows and scrolls.
const autoSizeStyle = { fieldSizing: 'content' } as CSSProperties;

type NativeTextareaProps = Omit<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>,
  'className' | 'style'
>;

type TextareaProps = NativeTextareaProps &
  NonNullable<Parameters<typeof textareaVariants>[0]> & {
    /** Error state for a field outside a Form; FormControl sets `aria-invalid` itself. */
    invalid?: boolean;
    /** Grow with the text instead of scrolling inside a fixed height. */
    autoSize?: boolean;
    'data-testid'?: string;
  };

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { onSurface, mono, autoSize, invalid, 'aria-invalid': ariaInvalid, ...props },
  ref,
) {
  // See Input: a FormControl merges a className in; it must not reach the element.
  const { className: _injected, ...native } = props as typeof props & { className?: string };
  const isInvalid = invalid || ariaInvalid === true || ariaInvalid === 'true';

  return (
    <textarea
      ref={ref}
      aria-invalid={isInvalid || undefined}
      className={textareaVariants({ onSurface, mono, autoSize })}
      style={autoSize ? autoSizeStyle : undefined}
      {...native}
    />
  );
});
