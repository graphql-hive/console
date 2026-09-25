import type { ReactNode } from 'react';
import { DocsLink, type DocsLinkProps } from '@/components/ui/docs-note';

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
    <div className="mb-4 flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <h1 className="text-fg m-0 text-lg font-medium">{title}</h1>
        {titleAccessory}
      </div>
      <p className="text-fg-default m-0 text-sm">{description}</p>
      {docsLink && (
        <div className="text-control">
          <DocsLink {...docsLink} />
        </div>
      )}
    </div>
  );
}
