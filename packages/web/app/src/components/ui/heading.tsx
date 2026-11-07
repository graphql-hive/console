import { ReactElement, ReactNode } from 'react';
import clsx from 'clsx';
import { headingStyles } from './heading.css';

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
    <HeadingLevel className={clsx(headingStyles.root({ size }), className)} {...props}>
      {children}
    </HeadingLevel>
  );
};
