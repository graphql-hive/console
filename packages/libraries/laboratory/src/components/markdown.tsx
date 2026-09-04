import { useMemo } from 'react';
import dompurify from 'dompurify';
import snarkdown from 'snarkdown';
import { cn } from '../lib/utils';

/**
 * Schema descriptions come from whatever endpoint the user points the Lab at, so
 * they are untrusted input. snarkdown passes raw HTML straight through, so the
 * sanitize step is what makes this safe, and it has to run on the rendered HTML
 * rather than the markdown.
 */
const ALLOWED_TAGS = [
  'p',
  'a',
  'code',
  'pre',
  'strong',
  'em',
  'ul',
  'ol',
  'li',
  'blockquote',
  'br',
];

let hooked = false;

const addLinkHardeningHook = () => {
  if (hooked) {
    return;
  }

  hooked = true;
  dompurify.addHook('afterSanitizeAttributes', node => {
    if (node.tagName === 'A') {
      node.setAttribute('rel', 'noopener noreferrer');
      node.setAttribute('target', '_blank');
    }
  });
};

export const Markdown = (props: { content: string; className?: string }) => {
  const html = useMemo(() => {
    addLinkHardeningHook();

    return dompurify.sanitize(snarkdown(props.content), {
      ALLOWED_TAGS,
      ALLOWED_ATTR: ['href', 'title'],
    });
  }, [props.content]);

  return (
    <div
      data-slot="markdown"
      className={cn(
        'text-muted-foreground [&_a]:text-primary text-xs leading-relaxed [&_a]:underline [&_code]:rounded [&_code]:bg-black/20 [&_code]:px-1 [&_code]:py-0.5',
        props.className,
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};
