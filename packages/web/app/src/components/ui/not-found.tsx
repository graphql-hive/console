import ghost from '../../../public/images/figures/ghost.svg?url';
import { Card } from '@/components/base/card/card';
import { cn } from '@/lib/utils';
import { Heading } from './heading';

export const NotFound = ({
  title,
  description,
  className,
}: {
  title: string;
  description: string;
  className?: string;
}) => {
  return (
    // `grid` rather than `flex flex-col`: grid items stretch on the block axis, so the card fills
    // the height `grow` claims without needing a class on Card itself.
    <div className={cn('grid grow', className)}>
      <Card variants={{ onSurface: 'base' }}>
        <div className="flex cursor-default flex-col items-center gap-y-2">
          <img
            src={ghost}
            alt="Ghost illustration"
            width="200"
            height="200"
            className="drag-none"
          />
          <Heading className="text-center">{title}</Heading>
          <span className="text-neutral-10 text-center text-sm font-medium">{description}</span>
        </div>
      </Card>
    </div>
  );
};
