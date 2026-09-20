import { ReactElement, useCallback, useEffect } from 'react';
import { format } from 'date-fns/format';
import { z } from 'zod';
import { Button } from '@/components/base/button/button';
import { Popover } from '@/components/base/floating/popover/popover';
import { useLocalStorageJson, useToggle } from '@/lib/hooks';
import { cn } from '@/lib/utils';

export type Changelog = {
  title: string;
  description: string;
  href: string;
  route?: string;
  date: string;
};

export function Changelog(props: { changes: Changelog[] }): ReactElement {
  return <ChangelogPopover changes={props.changes} />;
}

function ChangelogPopover(props: { changes: Changelog[] }) {
  const [isOpen, toggle] = useToggle();
  const [displayDot, setDisplayDot] = useLocalStorageJson(
    'hive:changelog:dot',
    z.boolean().default(false),
  );
  const [readChanges, setReadChanges] = useLocalStorageJson(
    'hive:changelog:read',
    z.array(z.string()).default([]),
  );
  const hasNewChanges = props.changes.some(change => !readChanges.includes(change.href));

  useEffect(() => {
    if (hasNewChanges) {
      setDisplayDot(true);
    }
  }, [hasNewChanges]);

  useEffect(() => {
    if (isOpen) {
      setDisplayDot(false);
    }
  }, [isOpen]);

  const handleChangelogClick = useCallback(
    (item: Changelog) => {
      // Keeps only relevant hrefs in the local storage
      const newReadChanges = [...readChanges, item.href].filter(href =>
        props.changes.some(change => change.href === href),
      );
      setReadChanges(newReadChanges);
    },
    [readChanges, setReadChanges, props.changes],
  );

  return (
    <Popover
      open={isOpen}
      onOpenChange={toggle}
      trigger={
        props.changes.length > 0 ? (
          <span className="relative inline-flex">
            <Button variant="outline">Latest changes</Button>
            {displayDot ? (
              <span className="absolute right-0 top-0 -mr-1 -mt-1 flex size-2">
                <span className="bg-accent absolute inline-flex size-full animate-pulse rounded-full" />
              </span>
            ) : null}
          </span>
        ) : undefined
      }
      width="xl"
      padding="none"
      collisionPadding={20}
      arrow
      content={
        <>
          <div className="grid">
            <div className="space-y-2 p-4">
              <h4 className="text-neutral-12 text-sm font-medium leading-none">
                What's new in Hive Console
              </h4>
              <p className="text-neutral-11 text-control">
                Find out about the newest features, and enhancements
              </p>
            </div>
            <ol className="relative m-0">
              {props.changes.map((change, index) => (
                <li
                  className={cn(
                    'border-l-2 pl-4',
                    readChanges.includes(change.href) ? 'border-transparent' : 'border-accent_80',
                  )}
                  key={index}
                >
                  <time className="text-neutral-10 mb-1 text-xs font-normal" dateTime={change.date}>
                    {format(new Date(change.date), 'do MMMM yyyy')}
                  </time>
                  <h3 className="text-neutral-12 mb-0.5 text-pretty text-sm font-medium hover:underline">
                    <a
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => handleChangelogClick(change)}
                      href={change.href}
                    >
                      {change.title}
                    </a>
                  </h3>
                  <p className="text-neutral-11 text-control mb-5 text-pretty font-normal">
                    {change.description}
                  </p>
                </li>
              ))}
            </ol>
          </div>
          <div className="flex flex-row items-center justify-center">
            <Button
              variant="link"
              anchor={{
                href: 'https://the-guild.dev/graphql/hive/product-updates',
                target: '_blank',
              }}
            >
              View all updates
            </Button>
          </div>
        </>
      }
    />
  );
}
