import type { ReactNode } from 'react';
import { DocsLink, type DocsLinkProps } from '@/components/ui/docs-note';
import * as shared from '@/styles/shared.css';
import { pageLeadStyles } from './page-lead.css';

export function PageLead({
  description,
  docsLink,
  title,
  titleAccessory,
}: {
  description: string;
  docsLink?: DocsLinkProps;
  title: string;
  /**
   * Optional element rendered to the right of the title (usage chip,
   * status badge, etc.). Aligned vertically center with the title; flows
   * inline rather than breaking onto its own row.
   */
  titleAccessory?: ReactNode;
}) {
  return (
    <div className={pageLeadStyles.root}>
      <div className={shared.row.gap2}>
        <h1 className={pageLeadStyles.title}>{title}</h1>
        {titleAccessory}
      </div>
      <p className={pageLeadStyles.description}>{description}</p>
      {docsLink && (
        <div className={shared.text.control}>
          <DocsLink {...docsLink} />
        </div>
      )}
    </div>
  );
}
