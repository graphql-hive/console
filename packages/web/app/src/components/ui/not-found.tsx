import ghost from '../../../public/images/figures/ghost.svg?url';
import { Card } from '@/components/v2/index';
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
    <Card
      className={cn('flex grow cursor-default flex-col items-center gap-y-2', className)}
      data-cy="empty-list"
    >
      <img src={ghost} alt="Ghost illustration" width="200" height="200" className="drag-none" />
      <Heading className="text-center">{title}</Heading>
      <span className="text-center text-sm font-medium text-gray-500">{description}</span>
    </Card>
  );
};
