import { ReactElement, ReactNode } from 'react';
import clsx from 'clsx';
import * as styles from './heading.css';

export const Heading = ({
  children,
  size = 'xl',
  className,
  ...props
}: {
  children: ReactNode;
  size?: 'lg' | 'xl' | '2xl';
  className?: string;
  id?: string;
}): ReactElement => {
  const HeadingLevel = size === '2xl' ? 'h1' : 'h3';

  return (
    <HeadingLevel
      className={clsx(
        styles.headingHeadingLevel,
        {
          lg: styles.headingLg,
          xl: styles.headingXl,
          '2xl': styles.heading2xl,
        }[size],
        className,
      )}
      {...props}
    >
      {children}
    </HeadingLevel>
  );
};
