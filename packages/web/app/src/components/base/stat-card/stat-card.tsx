import { type ComponentType, type ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { InfoIcon } from 'lucide-react';
import { Card, cardVariants } from '@/components/base/card/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const statTitleVariants = cva('text-sm font-medium', {
  variants: {
    tone: {
      default: 'text-neutral-11',
      success: 'text-emerald-500',
      danger: 'text-red-500',
      muted: 'text-neutral-10',
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
  variants?: VariantProps<typeof cardVariants> & VariantProps<typeof statTitleVariants>;
};

export function StatCard({ title, value, caption, icon: Icon, hint, variants }: StatCardProps) {
  return (
    <Card variants={variants}>
      <div className="flex flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <h3 className={statTitleVariants({ ...variants })}>{title}</h3>
          {hint ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <InfoIcon className="text-neutral-10 size-4" />
                </TooltipTrigger>
                <TooltipContent className="max-w-[300px] text-left text-sm">{hint}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : null}
        </div>
        {Icon ? <Icon className="text-neutral-10 size-4 shrink-0" /> : null}
      </div>
      <div className="text-neutral-12 mt-2 text-2xl font-bold">{value}</div>
      {caption ? <p className="text-neutral-10 text-xs">{caption}</p> : null}
    </Card>
  );
}
