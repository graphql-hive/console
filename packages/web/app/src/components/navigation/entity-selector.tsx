import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Link } from '@tanstack/react-router';

export function LoadingSkeleton({ className }: { className?: string }) {
  return <div className={cn('h-5 w-48 animate-pulse rounded-full bg-gray-800', className)} />;
}

export function BreadcrumbSeparator() {
  return <div className="italic text-gray-500">/</div>;
}

interface EntitySelectorProps<T extends { slug: string }> {
  // Current state
  currentSlug: string;
  currentItem: T | null | undefined;

  // Available items
  items: T[];

  // Behavior
  onNavigate: (slug: string) => void;

  // Rendering mode
  mode: 'link' | 'select';

  // Link-specific props
  linkTo?: string;
  linkParams?: Record<string, string>;

  // Testing
  dataCyPrefix: string;
}

export function EntitySelector<T extends { slug: string }>({
  currentSlug,
  currentItem,
  items,
  onNavigate,
  mode,
  linkTo,
  linkParams,
  dataCyPrefix,
}: EntitySelectorProps<T>) {
  if (mode === 'link') {
    return (
      <Link
        to={linkTo!}
        params={linkParams!}
        className="max-w-[200px] shrink-0 truncate font-medium"
      >
        {currentSlug}
      </Link>
    );
  }

  return (
    <Select value={currentSlug} onValueChange={onNavigate}>
      <SelectTrigger variant="default" data-cy={`${dataCyPrefix}-picker-trigger`}>
        <div className="font-medium" data-cy={`${dataCyPrefix}-picker-current`}>
          {currentItem?.slug}
        </div>
      </SelectTrigger>
      <SelectContent>
        {items.map(item => (
          <SelectItem
            key={item.slug}
            value={item.slug}
            data-cy={`${dataCyPrefix}-picker-option-${item.slug}`}
          >
            {item.slug}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
