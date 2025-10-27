import { forwardRef, useMemo } from 'react';
import { clsx } from 'clsx';
import dompurify from 'dompurify';
import snarkdown from 'snarkdown';

export const Markdown = forwardRef<
  HTMLDivElement,
  {
    content: string;
    className?: string;
  }
>(({ content, className, ...props }, ref) => {
  const sanitizedContent = useMemo(() => dompurify.sanitize(snarkdown(content)), [content]);

  return (
    <div
      ref={ref}
      className={clsx('hive-markdown', className)}
      dangerouslySetInnerHTML={{ __html: sanitizedContent }}
      {...props}
    />
  );
});
