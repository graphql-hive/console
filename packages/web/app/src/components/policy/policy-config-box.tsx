import { ReactElement } from 'react';
import clsx from 'clsx';
import { policyConfigBoxStyles } from './policy-config-box.css';

type Props = {
  className?: string;
} & { children: React.ReactNode; title?: ReactElement | string };

export function PolicyConfigBox(props: Props) {
  return (
    <div
      className={clsx(
        policyConfigBoxStyles.root({ untitled: !('title' in props) }),
        props.className,
      )}
    >
      {'title' in props ? (
        <>
          <div className={policyConfigBoxStyles.title}>{props.title}</div>
          <div>{props.children}</div>
        </>
      ) : (
        props.children
      )}
    </div>
  );
}
