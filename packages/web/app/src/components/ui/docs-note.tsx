import { ReactElement } from 'react';
import { Book, Megaphone } from 'lucide-react';
import { getDocsUrl, getProductUpdatesUrl } from '@/lib/docs-url';
import { ExternalLinkIcon } from '@radix-ui/react-icons';

export type DocsLinkProps = {
  href: string;
  icon?: ReactElement;
  text: string;
};

export const DocsLink = ({ href, icon, text }: DocsLinkProps) => {
  const fullUrl = href.startsWith('http') ? href : getDocsUrl(href);

  return (
    <a
      href={fullUrl}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center whitespace-pre-wrap p-0"
    >
      {icon ?? <Book className="mr-2 size-4" />}
      {text}
      <ExternalLinkIcon className="inline pl-1" />
    </a>
  );
};

export const ProductUpdatesLink = ({ href, text }: { href: string; text: string }) => {
  const fullUrl = href.startsWith('http') ? href : getProductUpdatesUrl(href);

  return (
    <a
      href={fullUrl}
      target="'_blank"
      rel="noreferrer"
      className="inline-flex items-center p-0 font-medium text-blue-500 transition-colors hover:underline"
    >
      <Megaphone className="mr-2 size-4" />
      {text}
      <ExternalLinkIcon className="inline pl-1" />
    </a>
  );
};
