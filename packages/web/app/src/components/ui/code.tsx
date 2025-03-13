import { useRef, type ComponentProps, type FC } from 'react';
import cn from 'clsx';
import { useHover } from '@/lib/hooks/use-hover';
import { useTimed } from '@/lib/hooks/use-timed';
import { CheckIcon, CopyIcon } from './icon';

export const Code: FC<ComponentProps<'code'>> = ({ children, className, ...props }) => {
  const [copied, startCopyTimer] = useTimed(1500);
  const [ref, hovering] = useHover();
  const codeRef = useRef<HTMLElement | null>(null)
  // in case this browser does not support this newer API...
  const navigatorClipboardSupport = typeof navigator.clipboard?.writeText === 'function';
  return (
    <span
      ref={ref}
      className="relative flex items-center gap-2 break-all rounded-md border border-gray-600 bg-black p-4 pr-14 font-mono text-sm cursor-text"
      // Make this element able to be focused by setting tabIndex.
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
      tabIndex={0}
      onFocus={() => {
        if (codeRef.current) {
          const selection = window.getSelection();
          const range = document.createRange();
          range.setStart(codeRef.current, 0);
          range.setEnd(codeRef.current, codeRef.current.childNodes.length);
          selection?.removeAllRanges();
          selection?.addRange(range);
        }
      }}
    >
      <code
        ref={codeRef}
        className={cn('whitespace-pre-line', className)}
        // always show code blocks in ltr
        dir="ltr"
        {...props}
      >
        {children}
      </code>
      <button
        hidden={!navigatorClipboardSupport}
        data-hovering={hovering || copied}
        className="absolute right-3 top-2 cursor-pointer rounded-md border border-gray-600 p-2 opacity-0 hover:text-orange-600 data-[hovering=true]:opacity-100 data-[hovering=true]:transition-opacity"
        onClick={async ev => {
          const value = children?.valueOf().toString();
          if (value) {
            ev.preventDefault();
            await navigator.clipboard.writeText(value);
            startCopyTimer();
          }
        }}
        title="Copy to clipboard"
      >
        {copied ? <CheckIcon size={16} /> : <CopyIcon size={16} />}
      </button>
    </span>
  );
};
