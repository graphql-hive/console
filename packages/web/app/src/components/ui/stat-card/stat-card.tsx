import { type ComponentType, type ReactNode } from 'react';
import { InfoIcon } from 'lucide-react';
import { Card } from '@/components/ui/primitives/card/card';
import { Tooltip } from '@/components/ui/primitives/floating/tooltip/tooltip';
import { lenient } from '@/lib/recipe';
import * as shared from '@/styles/shared.css';
import { statCardStyles } from './stat-card.css';

const statTitleVariants = lenient(statCardStyles.title);

type StatCardProps = {
  title: string;
  /** A node rather than a string, so a call site can suffix the figure (`1,204,880 (3,120 errors)`). */
  value: ReactNode;
  caption?: ReactNode;
  icon?: ComponentType<{ className?: string }>;
  /** Renders an info icon after the title, explaining how the metric is derived. */
  hint?: ReactNode;
  variants?: NonNullable<Parameters<typeof statTitleVariants>[0]>;
};

export function StatCard({ title, value, caption, icon: Icon, hint, variants }: StatCardProps) {
  return (
    <Card variants={{ onSurface: 'raised' }}>
      <div className={statCardStyles.header}>
        <div className={shared.row.gap1_5}>
          <h3 className={statTitleVariants({ ...variants })}>{title}</h3>
          {hint ? (
            <Tooltip
              trigger={
                <button type="button" aria-label="What this measures">
                  <InfoIcon className={statCardStyles.hintIcon} />
                </button>
              }
              content={hint}
            />
          ) : null}
        </div>
        {Icon ? <Icon className={statCardStyles.icon} /> : null}
      </div>
      <div className={statCardStyles.value}>{value}</div>
      {caption ? <p className={statCardStyles.caption}>{caption}</p> : null}
    </Card>
  );
}
