import { type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { Accordion as BaseAccordion } from '@base-ui/react/accordion';

export function Accordion({
  children,
  defaultValue,
}: {
  children: ReactNode;
  defaultValue?: number[];
}) {
  return <BaseAccordion.Root defaultValue={defaultValue}>{children}</BaseAccordion.Root>;
}

export function AccordionItem({ children, value }: { children: ReactNode; value: number }) {
  return <BaseAccordion.Item value={value}>{children}</BaseAccordion.Item>;
}

export function AccordionTrigger({
  label,
  variant = 'default',
}: {
  label: string;
  variant?: 'default' | 'accent';
}) {
  const colorClass =
    variant === 'accent'
      ? 'text-accent hover:text-accent/80'
      : 'text-neutral-12 hover:text-neutral-11';

  const chevronColor = variant === 'accent' ? 'text-accent' : 'text-neutral-8';

  return (
    <BaseAccordion.Trigger
      className={`${colorClass} flex w-full items-center gap-1.5 py-2 text-xs font-medium [&[data-panel-open]>svg]:rotate-0`}
    >
      <ChevronDown
        className={`${chevronColor} size-3 shrink-0 -rotate-90 transition-transform duration-200`}
      />
      {label}
    </BaseAccordion.Trigger>
  );
}

export function AccordionContent({ children }: { children: ReactNode }) {
  return (
    <BaseAccordion.Panel className="overflow-hidden text-sm data-[ending-style]:h-0 data-[starting-style]:h-0">
      <div className="pb-2 pt-2">{children}</div>
    </BaseAccordion.Panel>
  );
}
