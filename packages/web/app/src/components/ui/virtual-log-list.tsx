import { useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { useVirtualizer } from '@tanstack/react-virtual';

export type LogEntry = {
  timestamp: string;
  message: string;
};

const ITEM_HEIGHT = 24;

export function VirtualLogList(props: { logs: LogEntry[]; className?: string }) {
  const { logs } = props;
  const scrollRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: logs.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ITEM_HEIGHT,
    overscan: 5,
  });

  useEffect(() => {
    if (logs.length > 0) {
      virtualizer.scrollToIndex(logs.length - 1, { behavior: 'smooth' });
    }
  }, [logs.length]);

  return (
    <div ref={scrollRef} className={props.className} style={{ overflow: 'auto' }}>
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualizer.getVirtualItems().map(virtualItem => {
          const logRow = logs[virtualItem.index];
          return (
            <div
              key={virtualItem.index}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: virtualItem.size,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <div className="flex px-2 pb-1 font-mono text-xs">
                <time dateTime={logRow.timestamp} className="pr-4">
                  {format(logRow.timestamp, 'HH:mm:ss')}
                </time>
                {logRow.message}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
