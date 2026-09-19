import { type ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Info, type LucideIcon } from 'lucide-react';
import { Tooltip } from '../floating/tooltip/tooltip';

const labelVariants = cva('inline-block', {
  variants: {
    variant: {
      /** The form label: small caps, as on every field. */
      caps: 'text-neutral-10 text-[9px] font-medium uppercase tracking-[0.75px]',
      /** Sentence case beside a switch or a checkbox, in a row. */
      inline: 'text-neutral-11 text-xs font-normal',
    },
  },
  defaultVariants: {
    variant: 'caps',
  },
});

export type LabelHintProps = {
  /** What the control is for, behind an icon beside the label. */
  tooltip?: ReactNode;
  /** The icon that carries the tooltip. Info unless the control warrants another. */
  icon?: LucideIcon;
};

type LabelProps = VariantProps<typeof labelVariants> &
  LabelHintProps & {
    /** The id of the control this names. */
    htmlFor: string;
    /** Text only: a label names a control, anything more belongs in the tooltip. */
    label: string;
  };

/** The tooltip trigger beside a label. A button cannot sit inside a label, so it is a sibling. */
export function LabelHint({ tooltip, icon: Icon = Info, name }: LabelHintProps & { name: string }) {
  if (!tooltip) {
    return null;
  }
  return (
    <Tooltip
      trigger={
        <button
          type="button"
          aria-label={`About ${name}`}
          className="text-neutral-9 hover:text-neutral-11 inline-flex"
        >
          <Icon className="size-3" />
        </button>
      }
      content={tooltip}
    />
  );
}

/** A label for a control. On its own outside a form; inside one, FormLabel supplies `htmlFor`. */
export function Label({ htmlFor, variant, tooltip, icon, label }: LabelProps) {
  const element = (
    <label htmlFor={htmlFor} className={labelVariants({ variant })}>
      {label}
    </label>
  );
  if (!tooltip) {
    return element;
  }
  return (
    <span className="inline-flex items-center gap-1" data-label>
      {element}
      <LabelHint tooltip={tooltip} icon={icon} name={label} />
    </span>
  );
}

export { labelVariants };
