import type { ReactNode } from 'react';

export function PageLead({
  description,
  title,
  titleAccessory,
}: {
  description: string;
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
        <h1 className="text-neutral-12 m-0 text-[16px] font-medium">{title}</h1>
        {titleAccessory}
      </div>
      <p className="text-neutral-10 m-0 text-[13px]">{description}</p>
    </div>
  );
}
