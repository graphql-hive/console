import { type ReactNode, type Ref } from 'react';
import { ChevronRight } from 'lucide-react';
import { lenient } from '@/lib/recipe';
import { Collapsible as BaseCollapsible } from '@base-ui/react/collapsible';
import { collapsibleStyles } from './collapsible.css';

const headerVariants = lenient(collapsibleStyles.header);

const triggerVariants = lenient(collapsibleStyles.trigger);

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
  panelDataTestId?: string;
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
  panelDataTestId,
}: CollapsibleProps) {
  return (
    <BaseCollapsible.Root
      id={id}
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange ? next => onOpenChange(next) : undefined}
      className={collapsibleStyles.root}
    >
      <div className={headerVariants({ variant })}>
        <BaseCollapsible.Trigger className={triggerVariants({ variant })}>
          <ChevronRight className={collapsibleStyles.chevron} />
          <span className={collapsibleStyles.title}>{trigger}</span>
        </BaseCollapsible.Trigger>
        {actions}
      </div>
      <BaseCollapsible.Panel
        ref={panelRef}
        data-testid={panelDataTestId}
        className={collapsibleStyles.panel}
      >
        {children}
      </BaseCollapsible.Panel>
    </BaseCollapsible.Root>
  );
}
