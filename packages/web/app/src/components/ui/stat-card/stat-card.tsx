import { type ComponentType, type ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { InfoIcon } from 'lucide-react';
import { Card } from '@/components/ui/primitives/card/card';
import { Tooltip } from '@/components/ui/primitives/floating/tooltip/tooltip';

const statTitleVariants = cva('text-sm font-medium', {
  variants: {
    tone: {
      default: 'text-fg-default',
      success: 'text-success',
      danger: 'text-critical',
      muted: 'text-fg-secondary',
    },
  },
  defaultVariants: {
    tone: 'default',
  },
});

type StatCardProps = {
  title: string;
  /** A node rather than a string, so a call site can suffix the figure (`1,204,880 (3,120 errors)`). */
  value: ReactNode;
  caption?: ReactNode;
  icon?: ComponentType<{ className?: string }>;
  /** Renders an info icon after the title, explaining how the metric is derived. */
  hint?: ReactNode;
  variants?: VariantProps<typeof statTitleVariants>;
};

export function StatCard({ title, value, caption, icon: Icon, hint, variants }: StatCardProps) {
  return (
    <Card variants={{ onSurface: 'raised' }}>
      <div className="flex flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <h3 className={statTitleVariants({ ...variants })}>{title}</h3>
          {hint ? (
            <Tooltip
              trigger={
                <button type="button" aria-label="What this measures">
                  <InfoIcon className="size-4 text-fg-secondary" />
                </button>
              }
              content={hint}
            />
          ) : null}
        </div>
        {/* `shrink-0` so a title that wraps to two lines ("Relative Request Frequency") pushes the
            icon rather than squashing it. */}
        {Icon ? <Icon className="size-4 shrink-0 text-fg-secondary" /> : null}
      </div>
      <div className="mt-2 text-2xl font-bold text-fg">{value}</div>
      {caption ? <p className="text-xs text-fg-secondary">{caption}</p> : null}
    </Card>
  );
}
