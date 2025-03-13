import { CheckIcon, CopyIcon } from './icon';
import cn from 'clsx'
import type { ComponentProps, FC } from 'react'
import { useHover } from '@/lib/hooks/use-hover';
import { useTimed } from '@/lib/hooks/use-timed';

export const Code: FC<
  ComponentProps<'code'>
> = ({ children, className, ...props }) => {
  const [copied, startCopyTimer] = useTimed(1500);
  const [ref, hovering] = useHover();
  return (
    <span
      ref={ref}
      className="flex items-center gap-2 break-all rounded-md bg-black p-4 font-mono text-sm relative pr-14 border border-gray-600"
    >
      <code
        className={cn(
          'whitespace-pre-line',
          'cursor-text',
          className,
        )}
        // always show code blocks in ltr
        dir="ltr"
        {...props}
      >
        {children}
      </code>
      <button
        data-hovering={hovering || copied}
        className="cursor-pointer opacity-0 data-[hovering=true]:transition-opacity data-[hovering=true]:opacity-100 hover:text-orange-600 absolute right-3 top-2 p-2 border border-gray-600 rounded-md"
        onClick={async (ev) => {
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
  )
}
