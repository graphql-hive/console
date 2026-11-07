import { ReactElement, useCallback, useEffect } from 'react';
import { format } from 'date-fns/format';
import { z } from 'zod';
import { Button } from '@/components/ui/primitives/button/button';
import { Popover } from '@/components/ui/primitives/floating/popover/popover';
import { useLocalStorageJson, useToggle } from '@/lib/hooks';
import { changelogStyles } from './changelog.css';

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

  if (props.changes.length === 0) {
    return null;
  }

  return (
    <span className={changelogStyles.root}>
      <Popover
        open={isOpen}
        onOpenChange={toggle}
        trigger={<Button variant="outline">Latest changes</Button>}
        width="xl"
        padding="none"
        collisionPadding={20}
        arrow
        content={
          <>
            <div className={changelogStyles.content}>
              <div className={changelogStyles.header}>
                <h4 className={changelogStyles.title}>What's new in Hive Console</h4>
                <p className={changelogStyles.subtitle}>
                  Find out about the newest features, and enhancements
                </p>
              </div>
              <ol className={changelogStyles.list}>
                {props.changes.map((change, index) => (
                  <li
                    className={changelogStyles.item({ read: readChanges.includes(change.href) })}
                    key={index}
                  >
                    <time className={changelogStyles.date} dateTime={change.date}>
                      {format(new Date(change.date), 'do MMMM yyyy')}
                    </time>
                    <h3 className={changelogStyles.changeTitle}>
                      <a
                        target="_blank"
                        rel="noreferrer"
                        onClick={() => handleChangelogClick(change)}
                        href={change.href}
                      >
                        {change.title}
                      </a>
                    </h3>
                    <p className={changelogStyles.changeDescription}>{change.description}</p>
                  </li>
                ))}
              </ol>
            </div>
            <div className={changelogStyles.footer}>
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
      {displayDot ? (
        <span className={changelogStyles.dot}>
          <span className={changelogStyles.dotPulse} />
        </span>
      ) : null}
    </span>
  );
}
