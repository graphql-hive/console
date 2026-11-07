import { ReactElement } from 'react';
import { Book, ExternalLink, Megaphone } from 'lucide-react';
import { getDocsUrl, getProductUpdatesUrl } from '@/lib/docs-url';
import { docsNoteStyles } from './docs-note.css';

export type DocsLinkProps = {
  href: string;
  icon?: ReactElement;
  text: string;
};

export const DocsLink = ({ href, icon, text }: DocsLinkProps) => {
  const fullUrl = href.startsWith('http') ? href : getDocsUrl(href);

  return (
    <a href={fullUrl} target="_blank" rel="noreferrer" className={docsNoteStyles.docsLink}>
      {icon ?? <Book className={docsNoteStyles.leadingIcon} />}
      {text}
      <ExternalLink className={docsNoteStyles.externalIcon} />
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
      className={docsNoteStyles.productUpdatesLink}
    >
      <Megaphone className={docsNoteStyles.leadingIcon} />
      {text}
      <ExternalLink className={docsNoteStyles.externalIcon} />
    </a>
  );
};
