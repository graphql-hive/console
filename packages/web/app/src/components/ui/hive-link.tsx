import { HiveLogo } from '@/components/ui/brand-icon';
import { ReactElement } from 'react';
import clsx from 'clsx';
import { Link } from '@tanstack/react-router';

export const HiveLink = ({ className }: { className?: string }): ReactElement => {
  return (
    <Link to="/" className={clsx('inline-flex items-center', className)}>
      <HiveLogo />
    </Link>
  );
};
