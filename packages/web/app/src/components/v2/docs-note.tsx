import { ReactElement } from 'react';
import NextLink from 'next/link';
import { Book, Megaphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getDocsUrl, getProductUpdatesUrl } from '@/lib/docs-url';
import { cn } from '@/lib/utils';
import { ExternalLinkIcon } from '@radix-ui/react-icons';
import { Link } from './link';

export const DocsNote = ({ children, warn }: { warn?: boolean; children: React.ReactNode }) => {
  return (
    <div
      className={cn('my-2 flex border-l-2 px-4 py-2', warn ? 'border-orange-500' : 'border-white')}
    >
      {/* <div className="items-center align-middle pr-2 flex flex-row">
        {warn ? (
          <ExclamationTriangleIcon className="text-orange-500" />
        ) : (
          <InfoCircledIcon className="text-current" />
        )}
      </div> */}
      <div className="grow align-middle text-sm text-white">{children}</div>
    </div>
  );
};

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
    <Button variant="link" className={cn('p-0 text-orange-500', className)} asChild>
      <Link href={fullUrl} target="_blank" rel="noreferrer">
        {icon ?? <Book className="mr-2 size-4" />}
        {children}
        <ExternalLinkIcon className="inline pl-1" />
      </Link>
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
      <NextLink
        href={fullUrl}
        target={isExternal ? '_blank' : undefined}
        rel="noreferrer"
        className="font-medium transition-colors hover:underline"
        scroll={false}
      >
        {icon ?? <Megaphone className="mr-2 size-4" />}
        {children}
        {isExternal ? <ExternalLinkIcon className="inline pl-1" /> : null}
      </NextLink>
    </Button>
  );
};
