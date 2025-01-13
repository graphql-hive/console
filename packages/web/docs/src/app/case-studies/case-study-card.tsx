import { Anchor, ArrowIcon, cn } from '@theguild/components';

export interface CaseStudyCardProps extends React.HTMLAttributes<HTMLAnchorElement> {
  href: string;
  category: string;
  logo: React.ReactNode;
  excerpt: string;
  className?: string;
}

export function CaseStudyCard({
  href,
  category,
  logo,
  excerpt: description,
  className,
  ...rest
}: CaseStudyCardProps) {
  return (
    <Anchor
      href={href}
      className={cn(
        'hive-focus bg-beige-100 hover:bg-beige-200/70 hover:ring-beige-400 flex flex-col gap-6 rounded-2xl p-6 sm:gap-10 dark:bg-neutral-800/70 dark:ring-neutral-600 dark:hover:bg-neutral-800 hover:[&:not(:focus)]:ring dark:hover:[&:not(:focus)]:ring-neutral-600',
        className,
      )}
      {...rest}
    >
      <div>
        <div className="text-beige-800 mb-4 text-sm font-medium dark:text-neutral-400">
          {category}
        </div>
        {logo}
      </div>
      <p className="text-xl">{description}</p>
      <div className="flex items-center justify-between gap-2">
        Read full story
        <ArrowIcon />
      </div>
    </Anchor>
  );
}
