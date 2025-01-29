import { ReactNode } from 'react';
import { cn, Stud } from '@theguild/components';

export interface InfoCardProps extends React.HTMLAttributes<HTMLElement> {
  icon: ReactNode;
  heading: ReactNode;
  as?: 'div' | 'li';
}
export function InfoCard({
  as: Root = 'div',
  icon,
  heading,
  className,
  children,
  ...rest
}: InfoCardProps) {
  return (
    <Root className={cn('bg-beige-100 p-6 md:p-12', className)} {...rest}>
      <Stud>{icon}</Stud>
      <h3 className="text-green-1000 mt-4 text-xl font-medium leading-[1.4] md:mt-6">{heading}</h3>
      <div className="mt-2 space-y-2 text-green-800 md:mt-4">{children}</div>
    </Root>
  );
}
