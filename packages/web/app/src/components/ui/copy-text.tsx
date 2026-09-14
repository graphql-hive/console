import { ReactNode, useRef } from 'react';
import { Tooltip } from '@/components/base/floating/tooltip/tooltip';
import { useClipboard } from '@/lib/hooks';
import { cn } from '@/lib/utils';
import { Button } from './button';
import { CopyIcon } from './icon';

export function CopyText(props: { children: ReactNode; copy?: string; className?: string }) {
  const copyToClipboard = useClipboard();
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div className={cn('group flex items-center', props.className)}>
      <div ref={ref} className="truncate">
        {props.children}
      </div>
      <Tooltip
        trigger={
          <Button
            className="invisible -my-3 p-2 py-3 group-hover:visible"
            variant="link"
            onClick={async () => {
              await copyToClipboard(props.copy ?? ref.current?.innerText ?? '');
            }}
          >
            <CopyIcon size={14} />
          </Button>
        }
        content="Copy"
      />
    </div>
  );
}
