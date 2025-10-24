import { forwardRef } from 'react';
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
  return (
    <div
      ref={ref}
      className={clsx('hive-markdown', className)}
      dangerouslySetInnerHTML={{ __html: dompurify.sanitize(snarkdown(content)) }}
      {...props}
    />
  );
});
