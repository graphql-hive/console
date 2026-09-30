import { type ReactNode, type Ref } from 'react';
import { cva } from 'class-variance-authority';
import { ChevronRight } from 'lucide-react';
import { Collapsible as BaseCollapsible } from '@base-ui/react/collapsible';
import { focusRing } from '../shared-styles';

const headerVariants = cva('flex items-center', {
  variants: {
    variant: {
      section: '',
      // The border only shows while open, so a closed panel reads as one bar.
      panel: 'border-line group-data-[open]/collapsible:border-b pr-4',
    },
  },
});

const triggerVariants = cva(
  [
    'group/trigger flex min-w-0 grow items-center gap-2 text-left text-sm font-medium transition-colors',
    'text-fg-default hover:text-fg data-[panel-open]:text-fg',
    focusRing,
  ],
  {
    variants: {
      variant: {
        section: 'h-8 rounded-md px-2 hover:bg-neutral-5',
        panel: 'px-4 py-3',
      },
    },
  },
);

type CollapsibleProps = {
  /**
   * `section` is a group heading that toggles the list beneath it, as in a filter column.
   * `panel` is the header bar of a titled panel, with room for actions at its trailing edge.
   */
  variant?: 'section' | 'panel';
  /** The heading. Rendered inside the button, after the chevron. */
  trigger: ReactNode;
  /** Controls at the trailing edge of the header, outside the button, such as a reset or clear. */
  actions?: ReactNode;
  children: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  id?: string;
  /** The panel element, for code that scrolls it. */
  panelRef?: Ref<HTMLDivElement>;
  panelDataCy?: string;
};

export function Collapsible({
  variant = 'section',
  trigger,
  actions,
  children,
  open,
  defaultOpen,
  onOpenChange,
  id,
  panelRef,
  panelDataCy,
}: CollapsibleProps) {
  return (
    <BaseCollapsible.Root
      id={id}
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange ? next => onOpenChange(next) : undefined}
      className="group/collapsible flex min-h-0 flex-col"
    >
      <div className={headerVariants({ variant })}>
        <BaseCollapsible.Trigger className={triggerVariants({ variant })}>
          <ChevronRight className="text-fg-secondary size-4 shrink-0 transition-transform group-data-[panel-open]/trigger:rotate-90" />
          <span className="min-w-0 grow">{trigger}</span>
        </BaseCollapsible.Trigger>
        {actions}
      </div>
      <BaseCollapsible.Panel ref={panelRef} data-cy={panelDataCy} className="flex min-h-0 flex-col">
        {children}
      </BaseCollapsible.Panel>
    </BaseCollapsible.Root>
  );
}
