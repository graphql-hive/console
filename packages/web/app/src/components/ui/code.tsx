import type { ComponentProps, FC } from 'react';
import cn from 'clsx';
import { useHover } from '@/lib/hooks/use-hover';
import { useTimed } from '@/lib/hooks/use-timed';
import { CheckIcon, CopyIcon } from './icon';

export const Code: FC<ComponentProps<'code'>> = ({ children, className, ...props }) => {
  const [copied, startCopyTimer] = useTimed(1500);
  const [ref, hovering] = useHover();
  return (
    <span
      ref={ref}
      className="relative flex items-center gap-2 break-all rounded-md border border-gray-600 bg-black p-4 pr-14 font-mono text-sm"
    >
      <code
        className={cn('whitespace-pre-line', 'cursor-text', className)}
        // always show code blocks in ltr
        dir="ltr"
        {...props}
      >
        {children}
      </code>
      <button
        data-hovering={hovering || copied}
        className="absolute right-3 top-2 cursor-pointer rounded-md border border-gray-600 p-2 opacity-0 hover:text-orange-600 data-[hovering=true]:opacity-100 data-[hovering=true]:transition-opacity"
        onClick={async ev => {
          const value = children?.valueOf().toString();
          if (value) {
            ev.preventDefault();
            startCopyTimer();
            await navigator.clipboard.writeText(value);
          }
        }}
        title="Copy to clipboard"
      >
        {copied ? <CheckIcon size={16} /> : <CopyIcon size={16} />}
      </button>
    </span>
  );
};
