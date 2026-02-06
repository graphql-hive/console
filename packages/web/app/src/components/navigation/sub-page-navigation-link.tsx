import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type SubPageNavigationLinkProps = {
  dataCy?: string;
  isActive: boolean;
  onClick: () => void;
  title: string;
};

export function SubPageNavigationLink({
  dataCy,
  isActive,
  onClick,
  title,
}: SubPageNavigationLinkProps) {
  return (
    <Button
      data-cy={dataCy}
      variant="ghost"
      className={cn(
        isActive
          ? 'text-neutral-12 bg-neutral-5 hover:bg-neutral-5 dark:bg-neutral-3 dark:hover:bg-neutral-3'
          : 'text-neutral-11 hover:bg-transparent hover:underline',
        'justify-start',
      )}
      onClick={onClick}
    >
      {title}
    </Button>
  );
}
