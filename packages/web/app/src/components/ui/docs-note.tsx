import { ReactElement } from 'react';
import { Book, Megaphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getDocsUrl, getProductUpdatesUrl } from '@/lib/docs-url';
import { cn } from '@/lib/utils';
import { ExternalLinkIcon } from '@radix-ui/react-icons';

export const DocsLink = ({
  href,
  children,
  icon,
  className,
}: {
  href: string;
  icon?: ReactElement;
  children?: React.ReactNode;
  className?: string;
}) => {
  const fullUrl = href.startsWith('http') ? href : getDocsUrl(href);

  return (
    <Button
      asChild
      variant="link"
      className={cn(
        'p-0',
        'whitespace-pre-wrap', // to not lose whitespace between tags due to `display: 'inline-flex'`
        className,
      )}
    >
      <a href={fullUrl} target="_blank" rel="noreferrer">
        {icon ?? <Book className="mr-2 size-4" />}
        {children}
        <ExternalLinkIcon className="inline pl-1" />
      </a>
    </Button>
  );
};

export const ProductUpdatesLink = ({
  href,
  children,
  icon,
  className,
}: {
  href: string;
  icon?: ReactElement;
  children?: React.ReactNode;
  className?: string;
}) => {
  const fullUrl = href.startsWith('http')
    ? href
    : href.startsWith('#')
      ? href
      : getProductUpdatesUrl(href);

  const isExternal = !href.startsWith('#');

  return (
    <Button variant="link" className={cn('p-0 text-blue-500', className)} asChild>
      <a
        href={fullUrl}
        target={isExternal ? '_blank' : undefined}
        rel="noreferrer"
        className="font-medium transition-colors hover:underline"
      >
        {icon ?? <Megaphone className="mr-2 size-4" />}
        {children}
        {isExternal ? <ExternalLinkIcon className="inline pl-1" /> : null}
      </a>
    </Button>
  );
};
