import { ReactElement } from 'react';
import { Book, ExternalLink, Megaphone } from 'lucide-react';
import { getDocsUrl, getProductUpdatesUrl } from '@/lib/docs-url';

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
      className="hover:text-fg mt-2 inline-flex items-center whitespace-pre-wrap p-0 text-sm"
    >
      {icon ?? <Book className="mr-2 size-4" />}
      {text}
      <ExternalLink className="inline size-4 pl-1" />
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
      className="text-info inline-flex items-center p-0 font-medium transition-colors hover:underline"
    >
      <Megaphone className="mr-2 size-4" />
      {text}
      <ExternalLink className="inline size-4 pl-1" />
    </a>
  );
};
