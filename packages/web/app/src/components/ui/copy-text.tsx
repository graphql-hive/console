import { ReactNode, useRef } from 'react';
import { CopyIcon } from 'lucide-react';
import { Button } from '@/components/base/button/button';
import { Tooltip } from '@/components/base/floating/tooltip/tooltip';
import { useClipboard } from '@/lib/hooks';
import { cn } from '@/lib/utils';

export function CopyText(props: { children: ReactNode; copy?: string; className?: string }) {
  const copyToClipboard = useClipboard();
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div className={cn('group flex items-center gap-1', props.className)}>
      <div ref={ref} className="truncate">
        {props.children}
      </div>
      <span className="invisible inline-flex group-hover:visible">
        <Tooltip
          trigger={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Copy"
              onClick={async () => {
                await copyToClipboard(props.copy ?? ref.current?.innerText ?? '');
              }}
            >
              <CopyIcon className="size-3.5" />
            </Button>
          }
          content="Copy"
        />
      </span>
    </div>
  );
}
